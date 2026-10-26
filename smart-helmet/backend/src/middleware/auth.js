/**
 * JWT authentication middleware.
 * Verifies Bearer token and attaches user to req.user.
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { loadConfig } = require('../config');
const logger = require('../utils/logger');

/**
 * Verify JWT token from Authorization header.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Provide Bearer token.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Token missing.' });
    }

    const config = loadConfig();
    const decoded = jwt.verify(token, config.jwtSecret);

    let user = null;
    if (mongoose.connection.readyState === 1 && decoded.id !== 'admin_root_id') {
      try {
        user = await User.findById(decoded.id).select('-passwordHash');
      } catch (dbErr) {
        // Fall back to decoded token identity
      }
    }

    if (!user) {
      user = {
        _id: decoded.id,
        id: decoded.id,
        email: decoded.email,
        role: decoded.role || 'operator',
        displayName: decoded.email === (process.env.ADMIN_EMAIL || 'admin@smarthelmet.local')
          ? 'System Administrator'
          : 'Operator',
      };
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      logger.warn(`Invalid JWT attempt: ${err.message}`);
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    next(err);
  }
}

/**
 * Role-based authorization middleware factory.
 * @param  {...string} roles - Allowed roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user?.email} (role: ${req.user?.role}). Required: ${roles.join(', ')}`);
      return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
