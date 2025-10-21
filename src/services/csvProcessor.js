const csv = require('csv-parse');
const { parsePhoneNumber } = require('libphonenumber-js');
const fs = require('fs');
const pool = require('../config/database');

/**
 * CSV Processing and Validation Service
 * Handles phone normalization, DNC checking, deduplication, and validation
 */

class CSVProcessor {
  /**
   * Process uploaded CSV file
   * @param {string} filePath - Path to uploaded CSV file
   * @param {object} options - Processing options
   * @param {string} options.campaignId - Campaign UUID
   * @param {string} options.tenantId - Tenant UUID
   * @param {object} options.fieldMapping - Field name mapping (csv column -> db field)
   * @returns {Promise<object>} Processing results with stats
   */
  async processCSV(filePath, options) {
    const { campaignId, tenantId, fieldMapping = {} } = options;

    const results = {
      total: 0,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      dnc: 0,
      inserted: 0,
      errors: []
    };

    try {
      // Read and parse CSV
      const records = await this.parseCSV(filePath);
      results.total = records.length;

      // Load DNC list for this tenant
      const dncSet = await this.loadDNCList(tenantId);

      // Load existing phone numbers for deduplication
      const existingPhones = await this.loadExistingPhones(campaignId);

      // Process each record
      const validLeads = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rowNum = i + 2; // Account for header row

        try {
          // Apply field mapping
          const mappedRecord = this.applyFieldMapping(record, fieldMapping);

          // Validate required fields
          const validation = this.validateRecord(mappedRecord, rowNum);
          if (!validation.isValid) {
            results.invalid++;
            results.errors.push(...validation.errors);
            continue;
          }

          // Normalize phone number to E.164
          const phoneNormalization = this.normalizePhone(
            mappedRecord.phone,
            mappedRecord.country
          );

          if (!phoneNormalization.isValid) {
            results.invalid++;
            results.errors.push({
              row: rowNum,
              field: 'phone',
              value: mappedRecord.phone,
              error: phoneNormalization.error
            });
            continue;
          }

          const normalizedPhone = phoneNormalization.normalized;

          // Check DNC list
          if (dncSet.has(normalizedPhone)) {
            results.dnc++;
            results.errors.push({
              row: rowNum,
              field: 'phone',
              value: mappedRecord.phone,
              error: 'Phone number is on Do Not Call list'
            });
            continue;
          }

          // Check for duplicates
          if (existingPhones.has(normalizedPhone)) {
            results.duplicates++;
            results.errors.push({
              row: rowNum,
              field: 'phone',
              value: mappedRecord.phone,
              error: 'Duplicate phone number in campaign'
            });
            continue;
          }

          // Add to existing phones set for subsequent duplicate checking
          existingPhones.add(normalizedPhone);

          // Build lead object
          const lead = {
            campaign_id: campaignId,
            tenant_id: tenantId,
            phone: mappedRecord.phone,
            phone_normalized: normalizedPhone,
            first_name: mappedRecord.first_name || null,
            last_name: mappedRecord.last_name || null,
            email: mappedRecord.email || null,
            country: mappedRecord.country || null,
            type: mappedRecord.type || null,
            priority: mappedRecord.priority || 'normal',
            do_not_call: mappedRecord.do_not_call === 'true' || mappedRecord.do_not_call === true,
            notes: mappedRecord.notes || null,
            custom_fields: this.extractCustomFields(mappedRecord, fieldMapping)
          };

          validLeads.push(lead);
          results.valid++;

        } catch (error) {
          results.invalid++;
          results.errors.push({
            row: rowNum,
            error: `Processing error: ${error.message}`
          });
        }
      }

      // Bulk insert valid leads
      if (validLeads.length > 0) {
        results.inserted = await this.bulkInsertLeads(validLeads);

        // Update campaign total_leads count
        await this.updateCampaignLeadCount(campaignId);
      }

      return results;

    } catch (error) {
      throw new Error(`CSV processing failed: ${error.message}`);
    } finally {
      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  /**
   * Parse CSV file
   */
  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const records = [];

      fs.createReadStream(filePath)
        .pipe(csv.parse({
          columns: true,
          skip_empty_lines: true,
          trim: true
        }))
        .on('data', (record) => {
          records.push(record);
        })
        .on('end', () => {
          resolve(records);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Apply field mapping from CSV columns to database fields
   */
  applyFieldMapping(record, fieldMapping) {
    if (Object.keys(fieldMapping).length === 0) {
      // No mapping provided, use direct column names
      return record;
    }

    const mapped = {};
    for (const [csvField, dbField] of Object.entries(fieldMapping)) {
      if (record[csvField] !== undefined) {
        mapped[dbField] = record[csvField];
      }
    }
    return mapped;
  }

  /**
   * Validate record for required fields
   */
  validateRecord(record, rowNum) {
    const errors = [];

    // Phone is required
    if (!record.phone || record.phone.trim() === '') {
      errors.push({
        row: rowNum,
        field: 'phone',
        error: 'Phone number is required'
      });
    }

    // Priority validation
    if (record.priority && !['low', 'normal', 'high', 'urgent'].includes(record.priority)) {
      errors.push({
        row: rowNum,
        field: 'priority',
        value: record.priority,
        error: 'Priority must be one of: low, normal, high, urgent'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Normalize phone number to E.164 format
   */
  normalizePhone(phone, country = 'US') {
    try {
      // Remove any whitespace
      phone = phone.toString().trim();

      // If already in E.164 format, validate it
      if (phone.startsWith('+')) {
        const phoneNumber = parsePhoneNumber(phone);
        if (phoneNumber && phoneNumber.isValid()) {
          return {
            isValid: true,
            normalized: phoneNumber.number
          };
        }
      }

      // Try to parse with country code
      const phoneNumber = parsePhoneNumber(phone, country);

      if (phoneNumber && phoneNumber.isValid()) {
        return {
          isValid: true,
          normalized: phoneNumber.number
        };
      }

      return {
        isValid: false,
        error: 'Invalid phone number format'
      };

    } catch (error) {
      return {
        isValid: false,
        error: `Phone parsing error: ${error.message}`
      };
    }
  }

  /**
   * Load DNC list for tenant
   */
  async loadDNCList(tenantId) {
    const result = await pool.query(
      'SELECT phone_normalized FROM dnc_list WHERE tenant_id = $1 AND is_active = true',
      [tenantId]
    );

    return new Set(result.rows.map(row => row.phone_normalized));
  }

  /**
   * Load existing phone numbers for deduplication
   */
  async loadExistingPhones(campaignId) {
    const result = await pool.query(
      'SELECT phone_normalized FROM leads WHERE campaign_id = $1',
      [campaignId]
    );

    return new Set(result.rows.map(row => row.phone_normalized));
  }

  /**
   * Extract custom fields that aren't standard fields
   */
  extractCustomFields(record, fieldMapping) {
    const standardFields = new Set([
      'phone', 'first_name', 'last_name', 'email', 'country',
      'type', 'priority', 'do_not_call', 'notes'
    ]);

    const customFields = {};

    for (const [key, value] of Object.entries(record)) {
      if (!standardFields.has(key) && value) {
        customFields[key] = value;
      }
    }

    return Object.keys(customFields).length > 0 ? customFields : null;
  }

  /**
   * Bulk insert leads into database
   */
  async bulkInsertLeads(leads) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let insertedCount = 0;

      for (const lead of leads) {
        await client.query(`
          INSERT INTO leads (
            campaign_id, tenant_id, phone, phone_normalized,
            first_name, last_name, email, country, type,
            priority, do_not_call, notes, custom_fields, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending')
        `, [
          lead.campaign_id,
          lead.tenant_id,
          lead.phone,
          lead.phone_normalized,
          lead.first_name,
          lead.last_name,
          lead.email,
          lead.country,
          lead.type,
          lead.priority,
          lead.do_not_call,
          lead.notes,
          JSON.stringify(lead.custom_fields)
        ]);

        insertedCount++;
      }

      await client.query('COMMIT');
      return insertedCount;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update campaign's total_leads count
   */
  async updateCampaignLeadCount(campaignId) {
    await pool.query(`
      UPDATE campaigns
      SET total_leads = (
        SELECT COUNT(*) FROM leads WHERE campaign_id = $1
      )
      WHERE id = $1
    `, [campaignId]);
  }

  /**
   * Get CSV template headers
   */
  getCSVTemplate() {
    return [
      'first_name',
      'last_name',
      'phone',
      'country',
      'type',
      'priority',
      'do_not_call',
      'notes'
    ];
  }
}

module.exports = new CSVProcessor();
