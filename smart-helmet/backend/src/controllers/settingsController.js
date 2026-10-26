/**
 * Settings controller - threshold configuration management with in-memory fallback.
 */

const mongoose = require('mongoose');
const ThresholdConfig = require('../models/ThresholdConfig');
const inMemoryStore = require('../utils/inMemoryStore');
const { loadConfig } = require('../config');
const logger = require('../utils/logger');

/**
 * GET /api/settings/thresholds
 * Returns threshold configuration (device-specific or global).
 */
async function getThresholds(req, res, next) {
  try {
    const { deviceId } = req.query;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      try {
        if (deviceId) {
          const deviceConfig = await ThresholdConfig.findOne({ scope: 'device', deviceId }).lean();
          if (deviceConfig) return res.json(deviceConfig);
        }

        const globalConfig = await ThresholdConfig.findOne({ scope: 'global', deviceId: null }).lean();
        if (globalConfig) return res.json(globalConfig);
      } catch (err) {
        // fallback
      }
    }

    if (inMemoryStore.thresholds) {
      return res.json(inMemoryStore.thresholds);
    }

    const config = loadConfig();
    res.json({
      scope: 'global',
      deviceId: null,
      temperatureWarningC: config.temperatureWarningC,
      temperatureCriticalC: config.temperatureCriticalC,
      flameActiveHigh: config.flameActiveHigh,
      deviceOfflineTimeoutS: config.deviceOfflineTimeoutS,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/settings/thresholds
 * Update threshold configuration. Admin only.
 */
async function updateThresholds(req, res, next) {
  try {
    const { temperatureWarningC, temperatureCriticalC, flameActiveHigh, deviceOfflineTimeoutS, deviceId } = req.body;
    const isMongoConnected = mongoose.connection.readyState === 1;

    const scope = deviceId ? 'device' : 'global';
    const filterDeviceId = deviceId || null;

    if (isMongoConnected) {
      try {
        const config = await ThresholdConfig.findOneAndUpdate(
          { scope, deviceId: filterDeviceId },
          {
            $set: {
              temperatureWarningC,
              temperatureCriticalC,
              flameActiveHigh: flameActiveHigh !== undefined ? flameActiveHigh : true,
              deviceOfflineTimeoutS: deviceOfflineTimeoutS || 30,
              updatedAt: new Date(),
              updatedBy: req.user._id,
            },
          },
          { upsert: true, new: true, runValidators: true }
        );

        logger.info(`Threshold configuration updated (scope: ${scope}, deviceId: ${filterDeviceId})`);
        return res.json(config);
      } catch (err) {
        // fallback
      }
    }

    // In-memory update
    inMemoryStore.thresholds = {
      scope,
      deviceId: filterDeviceId,
      temperatureWarningC,
      temperatureCriticalC,
      flameActiveHigh: flameActiveHigh !== undefined ? flameActiveHigh : true,
      deviceOfflineTimeoutS: deviceOfflineTimeoutS || 30,
      updatedAt: new Date(),
    };

    logger.info(`Threshold configuration updated in-memory (scope: ${scope})`);
    res.json(inMemoryStore.thresholds);
  } catch (err) {
    next(err);
  }
}

module.exports = { getThresholds, updateThresholds };
