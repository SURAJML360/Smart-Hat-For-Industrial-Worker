/**
 * Telemetry controller - ingestion and history retrieval with in-memory fallback.
 */

const mongoose = require('mongoose');
const Telemetry = require('../models/Telemetry');
const telemetryService = require('../services/telemetryService');
const inMemoryStore = require('../utils/inMemoryStore');

/**
 * POST /api/telemetry
 * Ingest a telemetry reading from a device.
 */
async function ingestTelemetry(req, res, next) {
  try {
    const telemetry = await telemetryService.processTelemetry(req.body, 'hardware');

    res.json({
      success: true,
      receivedAt: telemetry.receivedAt,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/telemetry/latest/:deviceId
 * Returns the most recent telemetry reading for a device.
 */
async function getLatest(req, res, next) {
  try {
    const { deviceId } = req.params;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      try {
        const telemetry = await Telemetry.findOne({ deviceId }).sort({ receivedAt: -1 }).lean();
        if (telemetry) {
          return res.json(telemetry);
        }
      } catch (err) {
        // fallback
      }
    }

    // In-memory fallback
    const memTelemetry = [...inMemoryStore.telemetry].filter((t) => t.deviceId === deviceId).pop();
    if (!memTelemetry) {
      return res.status(404).json({ error: 'No telemetry found for this device.' });
    }

    res.json(memTelemetry);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/telemetry/history/:deviceId
 * Returns paginated telemetry history for a device.
 */
async function getHistory(req, res, next) {
  try {
    const { deviceId } = req.params;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 100));
        const skip = (page - 1) * limit;

        const dateFilter = { deviceId };
        if (req.query.startDate) {
          dateFilter.receivedAt = { ...dateFilter.receivedAt, $gte: new Date(req.query.startDate) };
        }
        if (req.query.endDate) {
          dateFilter.receivedAt = { ...dateFilter.receivedAt, $lte: new Date(req.query.endDate) };
        }

        const [telemetry, total] = await Promise.all([
          Telemetry.find(dateFilter).sort({ receivedAt: -1 }).skip(skip).limit(limit).lean(),
          Telemetry.countDocuments(dateFilter),
        ]);

        if (total > 0 || isMongoConnected) {
          return res.json({
            telemetry,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit),
            },
          });
        }
      } catch (err) {
        // fallback
      }
    }

    // In-memory fallback
    const filtered = inMemoryStore.telemetry.filter((t) => t.deviceId === deviceId);
    res.json({
      telemetry: [...filtered].reverse(),
      pagination: {
        page: 1,
        limit: 100,
        total: filtered.length,
        pages: 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { ingestTelemetry, getLatest, getHistory };
