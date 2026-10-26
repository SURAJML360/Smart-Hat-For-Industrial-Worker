/**
 * Zod schemas for alert endpoints.
 */

const { z } = require('zod');

const acknowledgeAlertSchema = z.object({
  notes: z.string().max(500).optional(),
});

const resolveAlertSchema = z.object({
  resolutionNote: z.string().max(500).optional(),
  resolution_note: z.string().max(500).optional(),
});

module.exports = { acknowledgeAlertSchema, resolveAlertSchema };
