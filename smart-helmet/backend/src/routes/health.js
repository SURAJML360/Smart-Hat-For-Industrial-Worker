/**
 * Health check route.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { SAFETY_DISCLAIMER } = require('../config');

// GET /api/health - Public health check
router.get('/', (req, res) => {
  const mongoStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const mongoStatus = mongoStates[mongoose.connection.readyState] || 'unknown';

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongoStatus,
    disclaimer: SAFETY_DISCLAIMER,
  });
});

module.exports = router;

