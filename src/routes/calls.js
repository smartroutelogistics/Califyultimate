const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * Call Management & Reports Routes
 */

/**
 * GET /api/calls - List calls with filters
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      campaign_id,
      agent_id,
      disposition,
      answered_by,
      date_from,
      date_to,
      limit = 50,
      offset = 0
    } = req.query;

    const tenantId = req.user.tenant_id;

    let query = `
      SELECT c.*, l.first_name, l.last_name, l.phone,
             cam.name as campaign_name, a.name as agent_name
      FROM calls c
      LEFT JOIN leads l ON c.lead_id = l.id
      LEFT JOIN campaigns cam ON c.campaign_id = cam.id
      LEFT JOIN agents a ON c.agent_id = a.id
      WHERE c.tenant_id = $1
    `;
    const params = [tenantId];
    let paramCount = 2;

    if (campaign_id) {
      query += ` AND c.campaign_id = $${paramCount}`;
      params.push(campaign_id);
      paramCount++;
    }

    if (agent_id) {
      query += ` AND c.agent_id = $${paramCount}`;
      params.push(agent_id);
      paramCount++;
    }

    if (disposition) {
      query += ` AND c.disposition = $${paramCount}`;
      params.push(disposition);
      paramCount++;
    }

    if (answered_by) {
      query += ` AND c.answered_by = $${paramCount}`;
      params.push(answered_by);
      paramCount++;
    }

    if (date_from) {
      query += ` AND c.start_time >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      query += ` AND c.start_time <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    query += ` ORDER BY c.start_time DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      calls: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calls'
    });
  }
});

/**
 * GET /api/calls/:id - Get call details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      SELECT c.*, l.first_name, l.last_name, l.phone, l.email,
             cam.name as campaign_name, a.name as agent_name, a.email as agent_email
      FROM calls c
      LEFT JOIN leads l ON c.lead_id = l.id
      LEFT JOIN campaigns cam ON c.campaign_id = cam.id
      LEFT JOIN agents a ON c.agent_id = a.id
      WHERE c.id = $1 AND c.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    res.json({
      success: true,
      call: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call'
    });
  }
});

/**
 * GET /api/calls/stats/summary - Get call statistics summary
 */
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { campaign_id, date_from, date_to } = req.query;
    const tenantId = req.user.tenant_id;

    let whereClause = 'WHERE c.tenant_id = $1';
    const params = [tenantId];
    let paramCount = 2;

    if (campaign_id) {
      whereClause += ` AND c.campaign_id = $${paramCount}`;
      params.push(campaign_id);
      paramCount++;
    }

    if (date_from) {
      whereClause += ` AND c.start_time >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND c.start_time <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    const result = await pool.query(`
      SELECT
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE disposition = 'answered') as answered_calls,
        COUNT(*) FILTER (WHERE disposition = 'voicemail') as voicemail_calls,
        COUNT(*) FILTER (WHERE disposition = 'no_answer') as no_answer_calls,
        COUNT(*) FILTER (WHERE disposition = 'busy') as busy_calls,
        COUNT(*) FILTER (WHERE disposition = 'failed') as failed_calls,
        COUNT(*) FILTER (WHERE answered_by = 'human') as human_answered,
        COUNT(*) FILTER (WHERE answered_by LIKE 'machine%') as machine_answered,
        AVG(duration) FILTER (WHERE duration IS NOT NULL) as avg_duration,
        AVG(talk_time) FILTER (WHERE talk_time IS NOT NULL) as avg_talk_time,
        SUM(cost) as total_cost
      FROM calls c
      ${whereClause}
    `, params);

    res.json({
      success: true,
      stats: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching call stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call statistics'
    });
  }
});

/**
 * GET /api/calls/stats/by-disposition - Get calls grouped by disposition
 */
router.get('/stats/by-disposition', authenticateToken, async (req, res) => {
  try {
    const { campaign_id } = req.query;
    const tenantId = req.user.tenant_id;

    let whereClause = 'WHERE tenant_id = $1';
    const params = [tenantId];

    if (campaign_id) {
      whereClause += ' AND campaign_id = $2';
      params.push(campaign_id);
    }

    const result = await pool.query(`
      SELECT disposition, COUNT(*) as count
      FROM calls
      ${whereClause}
      GROUP BY disposition
      ORDER BY count DESC
    `, params);

    res.json({
      success: true,
      dispositions: result.rows
    });

  } catch (error) {
    console.error('Error fetching disposition stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch disposition statistics'
    });
  }
});

module.exports = router;
