/**
 * Telemetry ingestion and query routes with payload normalization and logging.
 */

const express = require('express');
const router = express.Router();
const telemetryController = require('../controllers/telemetryController');
const { deviceAuth } = require('../middleware/deviceAuth');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { telemetryLimiter } = require('../middleware/rateLimiter');
const { telemetrySchema } = require('../validators/telemetry');
const logger = require('../utils/logger');

let autoSeq = 1;

/**
 * Normalizes incoming telemetry fields from various common naming conventions
 * to the authoritative schema required by the backend.
 */
function normalizeTelemetry(req, res, next) {
  logger.info(`Received telemetry packet from ${req.ip} - Headers: ${JSON.stringify(req.headers['x-device-token'] ? 'X-Device-Token: present' : 'No X-Device-Token')}`);

  if (req.body && typeof req.body === 'object') {
    const b = req.body;
    logger.info(`Raw telemetry payload: ${JSON.stringify(b)}`);

    // Only normalize if non-schema field names are used
    const hasSchemaFields = b.did && typeof b.seq === 'number' && typeof b.tc === 'number';
    if (!hasSchemaFields) {
      const tempC = Number(b.tc ?? b.temperature ?? b.temp ?? b.temperatureC ?? 25.0);
      req.body = {
        did: String(b.did || b.deviceId || b.device_id || b.id || 'HELMET-001'),
        seq: typeof b.seq === 'number' ? b.seq : typeof b.sequence === 'number' ? b.sequence : autoSeq++,
        tc: isNaN(tempC) ? 25.0 : tempC,
        tr: Number(
          b.tr ??
            b.temperatureRaw ??
            b.raw ??
            Math.max(0, Math.min(1023, Math.round(((isNaN(tempC) ? 25 : tempC) / 100) * 1023)))
        ),
        fd: Boolean(b.fd ?? b.flame ?? b.flameDetected ?? b.fire ?? false),
        fr: Number(b.fr ?? b.flameRaw ?? (b.fd ? 1 : 0)),
        up: Number(b.up ?? b.uptime ?? Math.round(process.uptime() * 1000)),
        fv: String(b.fv ?? b.firmwareVersion ?? b.version ?? '1.0.0'),
      };
    }
  }
  next();
}

// POST /api/telemetry - Hardware / device ingestion
router.post(
  '/',
  normalizeTelemetry,
  telemetryLimiter(),
  deviceAuth,
  validate(telemetrySchema),
  telemetryController.ingestTelemetry
);

// GET /api/telemetry/latest/:deviceId - Web client query
router.get('/latest/:deviceId', authenticate, telemetryController.getLatest);

// GET /api/telemetry/history/:deviceId - Web client query
router.get('/history/:deviceId', authenticate, telemetryController.getHistory);

module.exports = router;
