/**
 * Helmet model - represents a physical smart helmet device.
 */

const mongoose = require('mongoose');

const helmetSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  displayName: {
    type: String,
    default: '',
  },
  assignedWorker: {
    type: String,
    default: '',
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  lastSeenAt: {
    type: Date,
    default: null,
  },
  firmwareVersion: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'unknown'],
    default: 'unknown',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Helmet', helmetSchema);
