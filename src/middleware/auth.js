const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Authentication & Authorization Middleware
 */

/**
 * Verify JWT token and attach user to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database
    const result = await pool.query(
      'SELECT id, email, role, tenant_id, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token - user not found'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'User account is inactive'
      });
    }

    // Attach user to request
    req.user = user;

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Check if user has required role
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Ensure resource belongs to user's tenant (multi-tenancy enforcement)
 */
const enforceTenancy = (resourceTenantIdField = 'tenant_id') => {
  return (req, res, next) => {
    // Admin can access all tenants
    if (req.user.role === 'admin') {
      return next();
    }

    // For other users, ensure tenant_id matches
    const resourceTenantId = req.body[resourceTenantIdField] || req.params.tenantId;

    if (resourceTenantId && resourceTenantId !== req.user.tenant_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this resource'
      });
    }

    // Attach tenant_id to request body for create operations
    if (req.method === 'POST' || req.method === 'PUT') {
      req.body.tenant_id = req.user.tenant_id;
    }

    next();
  };
};

/**
 * Validate Twilio webhook signature
 */
const validateTwilioSignature = (req, res, next) => {
  // Skip validation in development if configured
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_TWILIO_VALIDATION === 'true') {
    return next();
  }

  const twilioSignature = req.headers['x-twilio-signature'];

  if (!twilioSignature) {
    return res.status(403).json({
      success: false,
      error: 'Missing Twilio signature'
    });
  }

  const twilio = require('twilio');
  const url = `${process.env.WEBHOOK_BASE_URL}${req.originalUrl}`;

  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    twilioSignature,
    url,
    req.body
  );

  if (!isValid) {
    console.error('Invalid Twilio signature for URL:', url);
    return res.status(403).json({
      success: false,
      error: 'Invalid Twilio signature'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  enforceTenancy,
  validateTwilioSignature
};
