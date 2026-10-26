/**
 * Zod validation middleware factory.
 * Validates req.body against a provided Zod schema.
 */

/**
 * Creates middleware that validates request body against a Zod schema.
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    // Replace body with parsed/coerced values
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
