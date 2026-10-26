/**
 * ThresholdConfig model - configurable alert thresholds (global or per-device).
 */

const mongoose = require('mongoose');

const thresholdConfigSchema = new mongoose.Schema({
  scope: {
    type: String,
    enum: ['global', 'device'],
    default: 'global',
  },
  deviceId: {
    type: String,
    default: null,
    index: true,
  },
  temperatureWarningC: {
    type: Number,
    required: true,
  },
  temperatureCriticalC: {
    type: Number,
    required: true,
  },
  flameActiveHigh: {
    type: Boolean,
    default: true,
  },
  deviceOfflineTimeoutS: {
    type: Number,
    default: 30,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
});

// Unique compound index: one config per scope+deviceId
thresholdConfigSchema.index({ scope: 1, deviceId: 1 }, { unique: true });

module.exports = mongoose.model('ThresholdConfig', thresholdConfigSchema);
