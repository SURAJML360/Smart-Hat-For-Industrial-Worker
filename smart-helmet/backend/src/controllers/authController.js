/**
 * Authentication controller with database and in-memory fallback support.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { loadConfig } = require('../config');
const logger = require('../utils/logger');

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const config = loadConfig();
    const isMongoConnected = mongoose.connection.readyState === 1;

    let userObj = null;

    if (isMongoConnected) {
      try {
        const user = await User.findOne({ email }).select('+passwordHash');
        if (user) {
          const isMatch = await bcrypt.compare(password, user.passwordHash);
          if (isMatch) {
            user.lastLoginAt = new Date();
            await user.save().catch(() => {});
            userObj = {
              id: user._id,
              email: user.email,
              role: user.role,
              displayName: user.displayName || 'Operator',
            };
          }
        }
      } catch (dbErr) {
        logger.warn(`Database query failed during login: ${dbErr.message}`);
      }
    }

    // Fallback authentication (works in standalone / offline mode)
    if (!userObj) {
      const defaultEmail = process.env.ADMIN_EMAIL || 'admin@smarthelmet.local';
      const defaultPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

      if (email.toLowerCase() === defaultEmail.toLowerCase() && password === defaultPassword) {
        userObj = {
          id: 'admin_root_id',
          email: defaultEmail,
          role: 'admin',
          displayName: 'System Administrator',
        };
      }
    }

    if (!userObj) {
      logger.warn(`Login failed: invalid credentials for ${email}`);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: userObj.id, email: userObj.email, role: userObj.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    logger.info(`User logged in successfully: ${userObj.email}`);
    res.json({
      token,
      user: userObj,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
