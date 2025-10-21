const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireRole, enforceTenancy } = require('../middleware/auth');

/**
 * Campaign Management Routes
 */

/**
 * GET /api/campaigns - List all campaigns for tenant
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const tenantId = req.user.tenant_id;

    let query = 'SELECT * FROM campaigns WHERE tenant_id = $1';
    const params = [tenantId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      campaigns: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns'
    });
  }
});

/**
 * GET /api/campaigns/:id - Get campaign details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign'
    });
  }
});

/**
 * POST /api/campaigns - Create new campaign
 */
router.post('/', authenticateToken, requireRole('admin', 'tenant_admin', 'manager'), enforceTenancy(), async (req, res) => {
  try {
    const {
      name,
      caller_id,
      schedule_start,
      schedule_end,
      timezone,
      calling_hours_start,
      calling_hours_end,
      agent_group_id,
      retry_policy,
      amd_enabled,
      voicemail_message_url,
      record_calls
    } = req.body;

    const tenantId = req.user.tenant_id;
    const createdBy = req.user.id;

    // Validation
    if (!name || !caller_id) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name and caller ID are required'
      });
    }

    // Insert campaign
    const result = await pool.query(`
      INSERT INTO campaigns (
        tenant_id, name, caller_id, schedule_start, schedule_end,
        timezone, calling_hours_start, calling_hours_end,
        agent_group_id, retry_policy, amd_enabled,
        voicemail_message_url, record_calls, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      tenantId, name, caller_id, schedule_start, schedule_end,
      timezone || 'UTC', calling_hours_start, calling_hours_end,
      agent_group_id, JSON.stringify(retry_policy), amd_enabled !== false,
      voicemail_message_url, record_calls !== false, createdBy
    ]);

    res.status(201).json({
      success: true,
      campaign: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign'
    });
  }
});

/**
 * PUT /api/campaigns/:id - Update campaign
 */
router.put('/:id', authenticateToken, requireRole('admin', 'tenant_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    // Check campaign exists and belongs to tenant
    const checkResult = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'caller_id', 'status', 'schedule_start', 'schedule_end',
      'timezone', 'calling_hours_start', 'calling_hours_end',
      'agent_group_id', 'retry_policy', 'amd_enabled',
      'voicemail_message_url', 'record_calls'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(field === 'retry_policy' ? JSON.stringify(req.body[field]) : req.body[field]);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    values.push(id);
    const query = `UPDATE campaigns SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      campaign: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign'
    });
  }
});

/**
 * DELETE /api/campaigns/:id - Delete campaign
 */
router.delete('/:id', authenticateToken, requireRole('admin', 'tenant_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(
      'DELETE FROM campaigns WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign'
    });
  }
});

/**
 * POST /api/campaigns/:id/start - Start campaign
 */
router.post('/:id/start', authenticateToken, requireRole('admin', 'tenant_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    // Update campaign status to active
    const result = await pool.query(
      'UPDATE campaigns SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *',
      ['active', id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Queue all pending leads
    await pool.query(`
      INSERT INTO call_queue (campaign_id, lead_id, scheduled_at, priority)
      SELECT $1, id, COALESCE(next_call_at, NOW()),
        CASE priority
          WHEN 'urgent' THEN 10
          WHEN 'high' THEN 8
          WHEN 'normal' THEN 5
          ELSE 3
        END
      FROM leads
      WHERE campaign_id = $1 AND status = 'pending'
    `, [id]);

    // Update leads to queued status
    await pool.query(
      'UPDATE leads SET status = $1 WHERE campaign_id = $2 AND status = $3',
      ['queued', id, 'pending']
    );

    res.json({
      success: true,
      message: 'Campaign started successfully',
      campaign: result.rows[0]
    });

  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start campaign'
    });
  }
});

/**
 * POST /api/campaigns/:id/pause - Pause campaign
 */
router.post('/:id/pause', authenticateToken, requireRole('admin', 'tenant_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(
      'UPDATE campaigns SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *',
      ['paused', id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      message: 'Campaign paused successfully',
      campaign: result.rows[0]
    });

  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause campaign'
    });
  }
});

module.exports = router;
