/**
 * Dashboard controller - summary statistics with database and in-memory fallback.
 */

const mongoose = require('mongoose');
const Helmet = require('../models/Helmet');
const Alert = require('../models/Alert');
const Telemetry = require('../models/Telemetry');
const inMemoryStore = require('../utils/inMemoryStore');

/**
 * GET /api/dashboard/summary
 * Returns overview statistics for the dashboard.
 */
async function getSummary(req, res, next) {
  try {
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      try {
        const [totalHelmets, onlineHelmets, offlineHelmets, activeAlerts, criticalAlerts, recentTelemetry] =
          await Promise.all([
            Helmet.countDocuments(),
            Helmet.countDocuments({ status: 'online' }),
            Helmet.countDocuments({ status: 'offline' }),
            Alert.countDocuments({ status: { $in: ['active', 'acknowledged'] } }),
            Alert.countDocuments({
              status: { $in: ['active', 'acknowledged'] },
              severity: 'critical',
            }),
            Telemetry.find().sort({ receivedAt: -1 }).limit(10).lean(),
          ]);

        return res.json({
          totalHelmets,
          onlineHelmets,
          offlineHelmets,
          activeAlerts,
          criticalAlerts,
          recentTelemetry,
        });
      } catch (err) {
        // fall through to in-memory
      }
    }

    // In-memory fallback
    const totalHelmets = inMemoryStore.helmets.length;
    const onlineHelmets = inMemoryStore.helmets.filter((h) => h.status === 'online').length;
    const offlineHelmets = totalHelmets - onlineHelmets;
    const activeAlerts = inMemoryStore.alerts.filter((a) => a.status === 'active' || a.status === 'acknowledged').length;
    const criticalAlerts = inMemoryStore.alerts.filter(
      (a) => (a.status === 'active' || a.status === 'acknowledged') && a.severity === 'critical'
    ).length;
    const recentTelemetry = [...inMemoryStore.telemetry].slice(-10).reverse();

    res.json({
      totalHelmets,
      onlineHelmets,
      offlineHelmets,
      activeAlerts,
      criticalAlerts,
      recentTelemetry,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary };
