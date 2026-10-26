/**
 * Helmet controller - CRUD operations with database and in-memory fallback.
 */

const mongoose = require('mongoose');
const Helmet = require('../models/Helmet');
const Telemetry = require('../models/Telemetry');
const Alert = require('../models/Alert');
const inMemoryStore = require('../utils/inMemoryStore');

/**
 * GET /api/helmets
 * Returns paginated list of helmets.
 */
async function listHelmets(req, res, next) {
  try {
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        const [helmets, total] = await Promise.all([
          Helmet.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
          Helmet.countDocuments(),
        ]);

        if (total > 0) {
          return res.json({
            helmets,
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
    res.json({
      helmets: inMemoryStore.helmets,
      pagination: {
        page: 1,
        limit: 20,
        total: inMemoryStore.helmets.length,
        pages: 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/helmets/:id
 * Returns helmet details with latest telemetry and recent alerts.
 */
async function getHelmet(req, res, next) {
  try {
    const deviceId = req.params.id;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      try {
        const helmet = await Helmet.findOne({ deviceId }).lean();
        if (helmet) {
          const latestTelemetry = await Telemetry.findOne({ deviceId }).sort({ receivedAt: -1 }).lean();
          const recentAlerts = await Alert.find({ deviceId }).sort({ createdAt: -1 }).limit(10).lean();

          return res.json({
            helmet,
            latestTelemetry,
            recentAlerts,
          });
        }
      } catch (err) {
        // fallback
      }
    }

    // In-memory fallback
    const memHelmet = inMemoryStore.helmets.find((h) => h.deviceId === deviceId);
    if (!memHelmet) {
      return res.status(404).json({ error: 'Helmet not found.' });
    }

    const latestTelemetry =
      [...inMemoryStore.telemetry].filter((t) => t.deviceId === deviceId).pop() || null;
    const recentAlerts =
      [...inMemoryStore.alerts].filter((a) => a.deviceId === deviceId).slice(-10).reverse();

    res.json({
      helmet: memHelmet,
      latestTelemetry,
      recentAlerts,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listHelmets, getHelmet };
