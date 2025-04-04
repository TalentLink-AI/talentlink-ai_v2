/**
 * Middleware for request validation using Joi schemas
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
exports.validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: error.details.map((detail) => detail.message).join(", "),
      });
    }

    next();
  };
};
