const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const pool = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const leadRoutes = require('./routes/leads');
const callRoutes = require('./routes/calls');
const agentRoutes = require('./routes/agents');
const webhookRoutes = require('./routes/webhooks');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// ============================================
// Middleware
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for Twilio webhooks
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// Health Check
// ============================================

app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'auto-calling-system',
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    name: 'Auto-Calling System API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      campaigns: '/api/campaigns/*',
      leads: '/api/leads/*',
      calls: '/api/calls/*',
      agents: '/api/agents/*',
      webhooks: '/webhooks/twilio/*'
    }
  });
});

// ============================================
// API Routes
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/agents', agentRoutes);
app.use('/webhooks', webhookRoutes);

// ============================================
// WebSocket - Real-time agent notifications
// ============================================

io.on('connection', (socket) => {
  console.log('Agent connected:', socket.id);

  // Agent joins their room (tenant-specific)
  socket.on('agent:join', (data) => {
    const { agentId, tenantId } = data;
    socket.join(`tenant:${tenantId}`);
    socket.join(`agent:${agentId}`);
    console.log(`Agent ${agentId} joined tenant ${tenantId}`);
  });

  // Agent updates status
  socket.on('agent:status', async (data) => {
    const { agentId, status } = data;

    try {
      await pool.query(
        'UPDATE agents SET status = $1, last_active_at = NOW() WHERE id = $2',
        [status, agentId]
      );

      // Broadcast to tenant
      const agent = await pool.query('SELECT tenant_id FROM agents WHERE id = $1', [agentId]);
      if (agent.rows.length > 0) {
        io.to(`tenant:${agent.rows[0].tenant_id}`).emit('agent:status:updated', {
          agentId,
          status
        });
      }
    } catch (error) {
      console.error('Error updating agent status:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Agent disconnected:', socket.id);
  });
});

// Make io available to routes (for sending notifications)
app.set('io', io);

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// ============================================
// Start Server
// ============================================

server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Auto-Calling System Server`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await pool.end();
    process.exit(0);
  });
});

module.exports = { app, server, io };
