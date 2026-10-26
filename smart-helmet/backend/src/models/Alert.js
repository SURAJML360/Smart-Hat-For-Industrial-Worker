/**
 * Alert model - safety alerts triggered by sensor data.
 */

const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'temperature_warning',
      'temperature_critical',
      'flame_detected',
      'device_offline',
      'device_reconnected',
    ],
    required: true,
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    required: true,
  },
  message: {
    type: String,
    default: '',
  },
  triggerValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved'],
    default: 'active',
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  acknowledgedAt: {
    type: Date,
    default: null,
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  resolutionNote: {
    type: String,
    default: '',
  },
  source: {
    type: String,
    enum: ['hardware', 'demo'],
    default: 'hardware',
  },
});

// Compound index for deduplication queries
alertSchema.index({ deviceId: 1, type: 1, status: 1 });

module.exports = mongoose.model('Alert', alertSchema);
