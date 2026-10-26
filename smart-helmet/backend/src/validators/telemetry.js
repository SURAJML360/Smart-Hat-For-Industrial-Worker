/**
 * Zod schema for telemetry ingestion.
 */

const { z } = require('zod');

const telemetrySchema = z.object({
  did: z.string().min(1, 'Device ID is required').max(50),
  seq: z.number().int().nonnegative('Sequence must be non-negative'),
  tc: z.number().finite('Temperature must be a finite number'),
  tr: z.number().int().nonnegative().max(1023, 'Raw temperature ADC max is 1023'),
  fd: z.boolean(),
  fr: z.number().int().min(0).max(1),
  up: z.number().int().nonnegative('Uptime must be non-negative'),
  fv: z.string().min(1, 'Firmware version is required').max(20),
});

module.exports = { telemetrySchema };
