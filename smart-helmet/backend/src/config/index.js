/**
 * Environment configuration with sensible defaults.
 * Loads values from process.env (populated by dotenv in server.js).
 */

const SAFETY_DISCLAIMER =
  'PROTOTYPE ONLY - This system is a college project and must NOT be used as a certified industrial safety system. ' +
  'It does not replace professional hazard monitoring, certified alarms, or workplace safety procedures.';

function loadConfig() {
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';

  // JWT_SECRET is required in production
  if (isProduction && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  return {
    env,
    isProduction,

    // Server
    port: parseInt(process.env.PORT, 10) || parseInt(process.env.API_PORT, 10) || 5000,
    host: process.env.HOST || '0.0.0.0',

    // Database
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_helmet',

    // Authentication
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    deviceToken: process.env.DEVICE_TOKEN || 'dev-device-token',

    // Thresholds (defaults)
    temperatureWarningC: parseFloat(process.env.TEMPERATURE_WARNING_C) || 45,
    temperatureCriticalC: parseFloat(process.env.TEMPERATURE_CRITICAL_C) || 60,
    flameActiveHigh: process.env.FLAME_ACTIVE_HIGH !== 'false',
    deviceOfflineTimeoutS: parseInt(process.env.DEVICE_OFFLINE_TIMEOUT_S, 10) || 30,

    // CORS
    corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:5173',

    // Demo mode
    demoMode: process.env.DEMO_MODE === 'true',
    demoDeviceId: process.env.DEMO_DEVICE_ID || 'HELMET-DEMO-001',
    demoIntervalMs: parseInt(process.env.DEMO_INTERVAL_MS, 10) || 2000,

    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',

    // Rate limiting
    telemetryRateLimit: parseInt(process.env.TELEMETRY_RATE_LIMIT, 10) || 120,
    apiRateLimit: parseInt(process.env.API_RATE_LIMIT, 10) || 100,

    // Admin seed
    adminEmail: process.env.ADMIN_EMAIL || 'admin@smarthelmet.local',
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',

    // Constants
    safetyDisclaimer: SAFETY_DISCLAIMER,
  };
}

module.exports = { loadConfig, SAFETY_DISCLAIMER };
