/**
 * Zod schema for threshold configuration updates.
 */

const { z } = require('zod');

const thresholdSchema = z
  .object({
    temperatureWarningC: z.number().min(0).max(200),
    temperatureCriticalC: z.number().min(0).max(300),
    flameActiveHigh: z.boolean().optional(),
    deviceOfflineTimeoutS: z.number().int().min(5).max(600).optional(),
    deviceId: z.string().max(50).nullable().optional(),
  })
  .refine((data) => data.temperatureCriticalC > data.temperatureWarningC, {
    message: 'Critical temperature must be greater than warning temperature',
    path: ['temperatureCriticalC'],
  });

module.exports = { thresholdSchema };
