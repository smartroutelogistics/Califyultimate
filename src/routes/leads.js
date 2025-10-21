const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/database');
const csvProcessor = require('../services/csvProcessor');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * Lead Management Routes
 */

// Configure multer for CSV file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

/**
 * POST /api/leads/upload - Upload CSV file and import leads
 */
router.post('/upload', authenticateToken, requireRole('admin', 'tenant_admin', 'manager'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { campaign_id, field_mapping } = req.body;

    if (!campaign_id) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
    }

    // Verify campaign belongs to user's tenant
    const campaignResult = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [campaign_id, req.user.tenant_id]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Parse field mapping if provided as string
    let fieldMappingObj = {};
    if (field_mapping) {
      try {
        fieldMappingObj = typeof field_mapping === 'string'
          ? JSON.parse(field_mapping)
          : field_mapping;
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid field mapping format'
        });
      }
    }

    // Process CSV
    const results = await csvProcessor.processCSV(req.file.path, {
      campaignId: campaign_id,
      tenantId: req.user.tenant_id,
      fieldMapping: fieldMappingObj
    });

    res.json({
      success: true,
      message: 'CSV processed successfully',
      results: {
        total: results.total,
        valid: results.valid,
        invalid: results.invalid,
        duplicates: results.duplicates,
        dnc: results.dnc,
        inserted: results.inserted
      },
      errors: results.errors.slice(0, 100) // Limit errors returned to first 100
    });

  } catch (error) {
    console.error('Error uploading leads:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload leads'
    });
  }
});

/**
 * GET /api/leads - List leads for a campaign
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { campaign_id, status, limit = 50, offset = 0 } = req.query;
    const tenantId = req.user.tenant_id;

    if (!campaign_id) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
    }

    let query = 'SELECT * FROM leads WHERE campaign_id = $1 AND tenant_id = $2';
    const params = [campaign_id, tenantId];

    if (status) {
      query += ' AND status = $3';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM leads WHERE campaign_id = $1 AND tenant_id = $2',
      [campaign_id, tenantId]
    );

    res.json({
      success: true,
      leads: result.rows,
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count)
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads'
    });
  }
});

/**
 * GET /api/leads/:id - Get lead details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(
      'SELECT * FROM leads WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      lead: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead'
    });
  }
});

/**
 * PUT /api/leads/:id - Update lead
 */
router.put('/:id', authenticateToken, requireRole('admin', 'tenant_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const allowedFields = [
      'first_name', 'last_name', 'email', 'type', 'priority',
      'do_not_call', 'notes', 'custom_fields'
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(field === 'custom_fields' ? JSON.stringify(req.body[field]) : req.body[field]);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    values.push(id, tenantId);
    const query = `UPDATE leads SET ${updates.join(', ')} WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      lead: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lead'
    });
  }
});

/**
 * DELETE /api/leads/:id - Delete lead
 */
router.delete('/:id', authenticateToken, requireRole('admin', 'tenant_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(
      'DELETE FROM leads WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lead'
    });
  }
});

/**
 * GET /api/leads/template/csv - Download CSV template
 */
router.get('/template/csv', (req, res) => {
  const headers = csvProcessor.getCSVTemplate();
  const csvContent = headers.join(',') + '\n';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=leads_template.csv');
  res.send(csvContent);
});

module.exports = router;
