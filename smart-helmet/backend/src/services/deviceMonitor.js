/**
 * Device monitor service.
 * Periodically checks for offline devices and creates/resolves alerts.
 */

const Helmet = require('../models/Helmet');
const Alert = require('../models/Alert');
const alertService = require('./alertService');
const { loadConfig } = require('../config');
const logger = require('../utils/logger');

let io = null;
let monitorInterval = null;

/**
 * Set the Socket.IO instance for broadcasting device status.
 * @param {import('socket.io').Server} socketIo
 */
function setIO(socketIo) {
  io = socketIo;
}

/**
 * Broadcast device status change via Socket.IO.
 * @param {string} deviceId
 * @param {string} status
 */
function broadcastDeviceStatus(deviceId, status) {
  if (io) {
    const data = { deviceId, status, timestamp: new Date().toISOString() };
    io.emit('device:status', data);
    io.to(deviceId).emit('device:status', data);
  }
}

/**
 * Check all enabled helmets for offline status.
 */
async function checkOfflineDevices() {
  try {
    const config = loadConfig();
    const timeoutMs = config.deviceOfflineTimeoutS * 1000;
    const cutoff = new Date(Date.now() - timeoutMs);

    // Find enabled helmets that have been seen but are past the timeout
    const helmets = await Helmet.find({
      enabled: true,
      lastSeenAt: { $ne: null, $lt: cutoff },
      status: { $ne: 'offline' },
    });

    for (const helmet of helmets) {
      // Mark as offline
      helmet.status = 'offline';
      await helmet.save();

      // Create offline alert if none active
      const existingOfflineAlert = await alertService.findActiveAlert(helmet.deviceId, 'device_offline');
      if (!existingOfflineAlert) {
        await alertService.createAlert({
          deviceId: helmet.deviceId,
          type: 'device_offline',
          severity: 'warning',
          message: `Device ${helmet.deviceId} has gone offline (last seen: ${helmet.lastSeenAt.toISOString()})`,
          triggerValue: helmet.lastSeenAt,
          source: 'hardware',
        });
      }

      broadcastDeviceStatus(helmet.deviceId, 'offline');
      logger.warn(`Device ${helmet.deviceId} marked offline`);
    }
  } catch (err) {
    logger.error(`Device monitor check failed: ${err.message}`);
  }
}

/**
 * Handle device reconnection — called when telemetry arrives from a previously offline device.
 * @param {string} deviceId
 */
async function handleReconnection(deviceId) {
  try {
    // Auto-resolve offline alerts
    await alertService.autoResolveAlerts(deviceId, ['device_offline'], 'Device reconnected');

    // Create informational reconnected alert
    const existingReconnect = await alertService.findActiveAlert(deviceId, 'device_reconnected');
    if (!existingReconnect) {
      const alert = await alertService.createAlert({
        deviceId,
        type: 'device_reconnected',
        severity: 'info',
        message: `Device ${deviceId} has reconnected`,
        triggerValue: new Date(),
        source: 'hardware',
      });

      // Auto-resolve the reconnected alert immediately (it's informational)
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      alert.resolutionNote = 'Auto-resolved: informational alert';
      await alert.save();
      alertService.broadcastAlert('alert:updated', alert.toObject());
    }

    broadcastDeviceStatus(deviceId, 'online');
    logger.info(`Device ${deviceId} reconnected`);
  } catch (err) {
    logger.error(`Error handling reconnection for ${deviceId}: ${err.message}`);
  }
}

/**
 * Start the periodic offline device monitor.
 * @param {number} [intervalMs=10000] - Check interval in milliseconds
 */
function start(intervalMs = 10000) {
  if (monitorInterval) {
    clearInterval(monitorInterval);
  }
  monitorInterval = setInterval(checkOfflineDevices, intervalMs);
  logger.info(`Device monitor started (interval: ${intervalMs}ms)`);
}

/**
 * Stop the periodic offline device monitor.
 */
function stop() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    logger.info('Device monitor stopped');
  }
}

module.exports = { setIO, start, stop, handleReconnection, checkOfflineDevices };
