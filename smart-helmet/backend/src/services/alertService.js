/**
 * Alert evaluation service with database and in-memory fallback support.
 * Handles alert creation, deduplication, escalation, and recovery.
 */

const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const ThresholdConfig = require('../models/ThresholdConfig');
const inMemoryStore = require('../utils/inMemoryStore');
const { loadConfig } = require('../config');
const logger = require('../utils/logger');

let io = null;

function setIO(socketIo) {
  io = socketIo;
}

function broadcastAlert(event, data) {
  if (io) {
    io.emit(event, data);
    if (data.deviceId) {
      io.to(data.deviceId).emit(event, data);
    }
  }
}

async function getThresholds(deviceId) {
  const isMongoConnected = mongoose.connection.readyState === 1;

  if (isMongoConnected) {
    try {
      if (deviceId) {
        const deviceConfig = await ThresholdConfig.findOne({ scope: 'device', deviceId });
        if (deviceConfig) return deviceConfig;
      }
      const globalConfig = await ThresholdConfig.findOne({ scope: 'global', deviceId: null });
      if (globalConfig) return globalConfig;
    } catch (err) {
      // fallback
    }
  }

  if (inMemoryStore.thresholds) {
    return inMemoryStore.thresholds;
  }

  const config = loadConfig();
  return {
    temperatureWarningC: config.temperatureWarningC,
    temperatureCriticalC: config.temperatureCriticalC,
    flameActiveHigh: config.flameActiveHigh,
    deviceOfflineTimeoutS: config.deviceOfflineTimeoutS,
  };
}

async function findActiveAlert(deviceId, type) {
  const isMongoConnected = mongoose.connection.readyState === 1;
  if (isMongoConnected) {
    try {
      return await Alert.findOne({ deviceId, type, status: { $in: ['active', 'acknowledged'] } });
    } catch (err) {
      // fallback
    }
  }
  return inMemoryStore.alerts.find(
    (a) => a.deviceId === deviceId && a.type === type && (a.status === 'active' || a.status === 'acknowledged')
  );
}

async function autoResolveAlerts(deviceId, types, note) {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const resolved = [];

  if (isMongoConnected) {
    try {
      const alerts = await Alert.find({
        deviceId,
        type: { $in: types },
        status: { $in: ['active', 'acknowledged'] },
      });

      for (const alert of alerts) {
        alert.status = 'resolved';
        alert.resolvedAt = new Date();
        alert.resolutionNote = note;
        await alert.save();
        resolved.push(alert);

        broadcastAlert('alert:updated', alert.toObject());
        logger.info(`Auto-resolved ${alert.type} alert for ${deviceId}: ${note}`);
      }
      return resolved;
    } catch (err) {
      // fallback
    }
  }

  // In-memory fallback
  for (const a of inMemoryStore.alerts) {
    if (a.deviceId === deviceId && types.includes(a.type) && (a.status === 'active' || a.status === 'acknowledged')) {
      a.status = 'resolved';
      a.resolvedAt = new Date();
      a.resolutionNote = note;
      resolved.push(a);
      broadcastAlert('alert:updated', a);
      logger.info(`Auto-resolved ${a.type} alert for ${deviceId}: ${note}`);
    }
  }

  return resolved;
}

async function createAlert(alertData) {
  const isMongoConnected = mongoose.connection.readyState === 1;
  let alert = null;

  if (isMongoConnected) {
    try {
      alert = await Alert.create(alertData);
      broadcastAlert('alert:new', alert.toObject());
      logger.info(`Alert created: ${alert.type} (${alert.severity}) for ${alert.deviceId}`);
      return alert;
    } catch (err) {
      // fallback
    }
  }

  // In-memory fallback
  alert = {
    _id: `mem_alert_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    ...alertData,
    status: 'active',
    createdAt: new Date(),
    toObject() {
      return { ...this };
    },
  };
  inMemoryStore.alerts.unshift(alert);
  if (inMemoryStore.alerts.length > 200) inMemoryStore.alerts.pop();

  broadcastAlert('alert:new', alert);
  logger.info(`Alert created in-memory: ${alert.type} (${alert.severity}) for ${alert.deviceId}`);
  return alert;
}

async function evaluateTelemetry(telemetry) {
  const { deviceId, temperatureC, flameDetected, source } = telemetry;
  const thresholds = await getThresholds(deviceId);
  const alertSource = source === 'demo' ? 'demo' : 'hardware';

  // --- Temperature evaluation ---
  if (typeof temperatureC === 'number' && !isNaN(temperatureC)) {
    if (temperatureC >= thresholds.temperatureCriticalC) {
      await autoResolveAlerts(deviceId, ['temperature_warning'], 'Escalated to critical temperature');

      const existingCrit = await findActiveAlert(deviceId, 'temperature_critical');
      if (!existingCrit) {
        await createAlert({
          deviceId,
          type: 'temperature_critical',
          severity: 'critical',
          message: `CRITICAL TEMPERATURE: ${temperatureC.toFixed(1)}°C (threshold: ${thresholds.temperatureCriticalC}°C)`,
          triggerValue: temperatureC,
          source: alertSource,
        });
      }
    } else if (temperatureC >= thresholds.temperatureWarningC) {
      await autoResolveAlerts(deviceId, ['temperature_critical'], 'De-escalated to warning temperature');

      const existingWarn = await findActiveAlert(deviceId, 'temperature_warning');
      if (!existingWarn) {
        await createAlert({
          deviceId,
          type: 'temperature_warning',
          severity: 'warning',
          message: `Temperature warning: ${temperatureC.toFixed(1)}°C (threshold: ${thresholds.temperatureWarningC}°C)`,
          triggerValue: temperatureC,
          source: alertSource,
        });
      }
    } else {
      await autoResolveAlerts(
        deviceId,
        ['temperature_warning', 'temperature_critical'],
        'Temperature returned to normal'
      );
    }
  }

  // --- Flame evaluation ---
  if (flameDetected) {
    const existingFlame = await findActiveAlert(deviceId, 'flame_detected');
    if (!existingFlame) {
      await createAlert({
        deviceId,
        type: 'flame_detected',
        severity: 'critical',
        message: `FLAME DETECTED at ${deviceId}! Immediate evacuation required!`,
        triggerValue: true,
        source: alertSource,
      });
    }
  } else {
    await autoResolveAlerts(deviceId, ['flame_detected'], 'Flame no longer detected');
  }
}

module.exports = {
  setIO,
  broadcastAlert,
  getThresholds,
  findActiveAlert,
  autoResolveAlerts,
  createAlert,
  evaluateTelemetry,
};
