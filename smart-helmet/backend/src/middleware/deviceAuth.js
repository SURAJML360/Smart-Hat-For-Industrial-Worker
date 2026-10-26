/**
 * Device authentication middleware.
 * Verifies X-Device-Token header against configured DEVICE_TOKEN.
 */

const { loadConfig } = require('../config');
const logger = require('../utils/logger');

function deviceAuth(req, res, next) {
  const token =
    (req.headers && (req.headers['x-device-token'] || req.headers['device-token'])) ||
    req.query?.token ||
    req.body?.token;

  if (!token) {
    logger.warn(`Device auth rejected: missing X-Device-Token header from ${req.ip}`);
    return res.status(401).json({ error: 'Device token required. Provide X-Device-Token header.' });
  }

  const config = loadConfig();
  if (token !== config.deviceToken) {
    logger.warn(`Device auth rejected: invalid token "${token}" from ${req.ip} (expected: "${config.deviceToken}")`);
    return res.status(401).json({ error: 'Invalid device token.' });
  }

  next();
}

module.exports = { deviceAuth };
