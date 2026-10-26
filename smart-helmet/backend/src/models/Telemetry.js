/**
 * Telemetry model - sensor readings from helmets.
 */

const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true,
  },
  sequence: {
    type: Number,
    default: 0,
  },
  temperatureC: {
    type: Number,
    default: null,
  },
  temperatureRaw: {
    type: Number,
    default: null,
  },
  flameDetected: {
    type: Boolean,
    default: false,
  },
  flameRaw: {
    type: Number,
    default: null,
  },
  deviceUptimeMs: {
    type: Number,
    default: 0,
  },
  firmwareVersion: {
    type: String,
    default: '',
  },
  receivedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  source: {
    type: String,
    enum: ['hardware', 'demo', 'test'],
    default: 'hardware',
    index: true,
  },
});

// Compound index for efficient queries by device and time
telemetrySchema.index({ deviceId: 1, receivedAt: -1 });

module.exports = mongoose.model('Telemetry', telemetrySchema);
