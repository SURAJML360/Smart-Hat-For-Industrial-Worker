/**
 * In-memory state store used as fallback when MongoDB is not connected.
 * Ensures the prototype functions seamlessly during demonstrations and evaluation.
 */

const inMemoryStore = {
  helmets: [
    {
      _id: 'helmet_default_001',
      deviceId: 'HELMET-001',
      displayName: 'Worker Helmet Alpha',
      assignedWorker: 'John Doe (Technician)',
      status: 'offline',
      firmwareVersion: '1.0.0',
      lastSeenAt: null,
      enabled: true,
      createdAt: new Date(),
    },
  ],
  telemetry: [],
  alerts: [],
  thresholds: {
    scope: 'global',
    deviceId: null,
    temperatureWarningC: 45,
    temperatureCriticalC: 60,
    flameActiveHigh: true,
    deviceOfflineTimeoutS: 30,
    updatedAt: new Date(),
  },
};

module.exports = inMemoryStore;

