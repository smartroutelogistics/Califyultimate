const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * Agent Management Routes
 */

/**
 * GET /api/agents - List all agents for tenant
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, agent_group_id } = req.query;
    const tenantId = req.user.tenant_id;

    let query = 'SELECT * FROM agents WHERE tenant_id = $1';
    const params = [tenantId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    if (agent_group_id) {
      const paramNum = params.length + 1;
      query += ` AND agent_group_id = $${paramNum}`;
      params.push(agent_group_id);
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      agents: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents'
    });
  }
});

/**
 * GET /api/agents/:id - Get agent details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(
      'SELECT * FROM agents WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      agent: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent'
    });
  }
});

/**
 * POST /api/agents - Create new agent
 */
router.post('/', authenticateToken, requireRole('admin', 'tenant_admin', 'manager'), async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      agent_group_id,
      max_concurrent_calls,
      working_hours
    } = req.body;

    const tenantId = req.user.tenant_id;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Agent name and phone are required'
      });
    }

    const result = await pool.query(`
      INSERT INTO agents (
        tenant_id, name, phone, email, agent_group_id,
        max_concurrent_calls, working_hours
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      tenantId, name, phone, email, agent_group_id,
      max_concurrent_calls || 1,
      working_hours ? JSON.stringify(working_hours) : null
    ]);

    res.status(201).json({
      success: true,
      agent: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create agent'
    });
  }
});

/**
 * PUT /api/agents/:id - Update agent
 */
router.put('/:id', authenticateToken, requireRole('admin', 'tenant_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const allowedFields = [
      'name', 'phone', 'email', 'agent_group_id', 'status',
      'max_concurrent_calls', 'working_hours', 'is_active'
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(field === 'working_hours' ? JSON.stringify(req.body[field]) : req.body[field]);
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
    const query = `UPDATE agents SET ${updates.join(', ')} WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      agent: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent'
    });
  }
});

/**
 * PUT /api/agents/:id/status - Update agent status (for agent console)
 */
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const tenantId = req.user.tenant_id;

    if (!['available', 'busy', 'offline', 'break'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: available, busy, offline, or break'
      });
    }

    const result = await pool.query(
      'UPDATE agents SET status = $1, last_active_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *',
      [status, id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      agent: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent status'
    });
  }
});

/**
 * DELETE /api/agents/:id - Delete agent
 */
router.delete('/:id', authenticateToken, requireRole('admin', 'tenant_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(
      'DELETE FROM agents WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete agent'
    });
  }
});

/**
 * GET /api/agents/:id/stats - Get agent statistics
 */
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { date_from, date_to } = req.query;
    const tenantId = req.user.tenant_id;

    // Verify agent exists
    const agentResult = await pool.query(
      'SELECT * FROM agents WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    let whereClause = 'WHERE agent_id = $1';
    const params = [id];
    let paramCount = 2;

    if (date_from) {
      whereClause += ` AND start_time >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND start_time <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE disposition = 'answered') as answered_calls,
        AVG(talk_time) FILTER (WHERE talk_time IS NOT NULL) as avg_talk_time,
        SUM(talk_time) FILTER (WHERE talk_time IS NOT NULL) as total_talk_time
      FROM calls
      ${whereClause}
    `, params);

    res.json({
      success: true,
      agent: agentResult.rows[0],
      stats: statsResult.rows[0]
    });

  } catch (error) {
    console.error('Error fetching agent stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent statistics'
    });
  }
});

module.exports = router;
