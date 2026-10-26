/**
 * Zod schemas for authentication endpoints.
 */

const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Valid email is required').max(255),
  password: z.string().min(1, 'Password is required').max(255),
});

module.exports = { loginSchema };
