/**
 * Rate limiting middleware using express-rate-limit.
 */

const rateLimit = require('express-rate-limit');
const { loadConfig } = require('../config');

/**
 * Rate limiter for telemetry ingestion endpoint.
 * Higher limit, per-minute window.
 */
function telemetryLimiter() {
  const config = loadConfig();
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: config.telemetryRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many telemetry submissions. Please slow down.' },
    keyGenerator: (req) => req.ip,
  });
}

/**
 * Rate limiter for general API endpoints.
 * 15-minute window.
 */
function apiLimiter() {
  const config = loadConfig();
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config.apiRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
    keyGenerator: (req) => req.ip,
  });
}

module.exports = { telemetryLimiter, apiLimiter };
