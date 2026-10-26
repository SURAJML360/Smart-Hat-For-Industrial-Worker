/**
 * Alert controller - listing, acknowledging, and resolving alerts with in-memory fallback.
 */

const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const inMemoryStore = require('../utils/inMemoryStore');
const logger = require('../utils/logger');

/**
 * GET /api/alerts
 * Returns paginated alerts with optional filters.
 */
async function listAlerts(req, res, next) {
  try {
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.severity) filter.severity = req.query.severity;
        if (req.query.deviceId) filter.deviceId = req.query.deviceId;

        const [alerts, total] = await Promise.all([
          Alert.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('acknowledgedBy', 'email displayName')
            .populate('resolvedBy', 'email displayName')
            .lean(),
          Alert.countDocuments(filter),
        ]);

        if (total > 0 || isMongoConnected) {
          return res.json({
            alerts,
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
    let filtered = inMemoryStore.alerts;
    if (req.query.status) filtered = filtered.filter((a) => a.status === req.query.status);
    if (req.query.severity) filtered = filtered.filter((a) => a.severity === req.query.severity);
    if (req.query.deviceId) filtered = filtered.filter((a) => a.deviceId === req.query.deviceId);

    res.json({
      alerts: filtered,
      pagination: {
        page: 1,
        limit: 20,
        total: filtered.length,
        pages: 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/alerts/:id/acknowledge
 * Acknowledge an active alert.
 */
async function acknowledgeAlert(req, res, next) {
  try {
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      try {
        const alert = await Alert.findById(req.params.id);
        if (alert) {
          if (alert.status === 'resolved') {
            return res.status(400).json({ error: 'Alert is already resolved.' });
          }
          if (alert.status === 'acknowledged') {
            return res.status(400).json({ error: 'Alert is already acknowledged.' });
          }

          alert.status = 'acknowledged';
          alert.acknowledgedAt = new Date();
          alert.acknowledgedBy = req.user._id;
          if (req.body.notes) {
            alert.resolutionNote = req.body.notes;
          }
          await alert.save();

          const { broadcastAlert } = require('../services/alertService');
          broadcastAlert('alert:updated', alert.toObject());

          logger.info(`Alert ${alert._id} acknowledged by ${req.user.email}`);
          return res.json(alert);
        }
      } catch (err) {
        // fallback
      }
    }

    // In-memory fallback
    const memAlert = inMemoryStore.alerts.find((a) => a._id === req.params.id);
    if (!memAlert) {
      return res.status(404).json({ error: 'Alert not found.' });
    }

    memAlert.status = 'acknowledged';
    memAlert.acknowledgedAt = new Date();
    memAlert.acknowledgedBy = { email: req.user.email, displayName: req.user.displayName };
    if (req.body.notes) memAlert.resolutionNote = req.body.notes;

    const { broadcastAlert } = require('../services/alertService');
    broadcastAlert('alert:updated', memAlert);
    res.json(memAlert);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/alerts/:id/resolve
 * Resolve an alert.
 */
async function resolveAlert(req, res, next) {
  try {
    const isMongoConnected = mongoose.connection.readyState === 1;
    const note = req.body.resolutionNote || req.body.resolution_note || 'Resolved by operator';

    if (isMongoConnected) {
      try {
        const alert = await Alert.findById(req.params.id);
        if (alert) {
          if (alert.status === 'resolved') {
            return res.status(400).json({ error: 'Alert is already resolved.' });
          }

          alert.status = 'resolved';
          alert.resolvedAt = new Date();
          alert.resolvedBy = req.user._id;
          alert.resolutionNote = note;
          await alert.save();

          const { broadcastAlert } = require('../services/alertService');
          broadcastAlert('alert:updated', alert.toObject());

          logger.info(`Alert ${alert._id} resolved by ${req.user.email}`);
          return res.json(alert);
        }
      } catch (err) {
        // fallback
      }
    }

    // In-memory fallback
    const memAlert = inMemoryStore.alerts.find((a) => a._id === req.params.id);
    if (!memAlert) {
      return res.status(404).json({ error: 'Alert not found.' });
    }

    memAlert.status = 'resolved';
    memAlert.resolvedAt = new Date();
    memAlert.resolvedBy = { email: req.user.email, displayName: req.user.displayName };
    memAlert.resolutionNote = note;

    const { broadcastAlert } = require('../services/alertService');
    broadcastAlert('alert:updated', memAlert);
    res.json(memAlert);
  } catch (err) {
    next(err);
  }
}

module.exports = { listAlerts, acknowledgeAlert, resolveAlert };
