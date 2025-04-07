// backend/job-service/src/middlewares/validation.middleware.js
const logger = require("../utils/logger");

/**
 * Middleware for request validation using Joi schemas
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
exports.validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);

    if (error) {
      logger.warn(`Validation error: ${error.message}`, {
        path: req.path,
        body: req.body,
        error: error.details,
      });

      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: error.details.map((detail) => detail.message).join(", "),
      });
    }

    next();
  };
};

/**
 * Middleware to check if a user is the owner of a job
 * @param {Object} jobModel - Mongoose model for jobs
 * @returns {Function} Express middleware function
 */
exports.isJobOwner = (jobModel) => {
  return async (req, res, next) => {
    try {
      const jobId = req.params.id;
      const userId = req.auth.payload.sub;

      const job = await jobModel.findById(jobId);

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.clientId !== userId) {
        logger.warn(
          `Unauthorized job access attempt: User ${userId} tried to access job ${jobId} owned by ${job.clientId}`
        );
        return res.status(403).json({
          message: "You don't have permission to perform this action",
        });
      }

      // Add job to request object for use in controller
      req.job = job;
      next();
    } catch (error) {
      logger.error(`Error in isJobOwner middleware: ${error.message}`, {
        stack: error.stack,
      });
      next(error);
    }
  };
};

/**
 * Middleware to check if user has the client role
 * @returns {Function} Express middleware function
 */
exports.isClient = () => {
  return (req, res, next) => {
    try {
      // Get roles from the Auth0 token payload
      const roles = req.auth?.payload?.["https://talentlink.com/roles"] || [];
      const userRole =
        req.auth?.payload?.["https://talentlink.com/role"] || null;

      // Add user role info to request object for use in controllers
      req.userRole =
        userRole || (roles.includes("client") ? "client" : "talent");

      // For debugging
      logger.info(
        `isClient check: User ${
          req.auth?.payload?.sub
        } has roles ${JSON.stringify(roles)} and role ${userRole}`
      );

      // Allow admin access too
      if (roles.includes("admin")) {
        return next();
      }

      if (!roles.includes("client")) {
        return res.status(403).json({
          success: false,
          message: "This action requires a client account",
          userRole: req.userRole,
        });
      }

      next();
    } catch (error) {
      logger.error(`Error in isClient middleware: ${error.message}`, {
        stack: error.stack,
      });
      next(error);
    }
  };
};

/**
 * Middleware to check if user has the talent role
 * @returns {Function} Express middleware function
 */
exports.isTalent = () => {
  return (req, res, next) => {
    try {
      // Get roles from the Auth0 token payload
      const roles = req.auth?.payload?.["https://talentlink.com/roles"] || [];
      const userRole =
        req.auth?.payload?.["https://talentlink.com/role"] || null;

      // Add user role info to request object for use in controllers
      req.userRole =
        userRole || (roles.includes("talent") ? "talent" : "client");

      // For debugging
      logger.info(
        `isTalent check: User ${
          req.auth?.payload?.sub
        } has roles ${JSON.stringify(roles)} and role ${userRole}`
      );

      // Allow admin access too
      if (roles.includes("admin")) {
        return next();
      }

      if (!roles.includes("talent")) {
        logger.warn(
          `Non-talent access attempt: User ${req.auth?.payload?.sub} tried to access talent-only endpoint`
        );
        return res
          .status(403)
          .json({ message: "This action requires a talent account" });
      }

      next();
    } catch (error) {
      logger.error(`Error in isTalent middleware: ${error.message}`, {
        stack: error.stack,
      });
      next(error);
    }
  };
};

/**
 * Middleware to add client ID to request body
 * @returns {Function} Express middleware function
 */
exports.addClientIdToBody = (req, res, next) => {
  try {
    // Extract the user ID from the auth token (sub claim)
    const userId = req.auth?.payload?.sub;

    if (!userId) {
      logger.warn("No user ID found in auth token");
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Add clientId to the request body if not already set
    if (req.body && !req.body.clientId) {
      req.body.clientId = userId;
      logger.info(`Added clientId ${userId} to request body`);
    }

    next();
  } catch (error) {
    logger.error(`Error in addClientIdToBody middleware: ${error.message}`, {
      stack: error.stack,
    });
    next(error);
  }
};

/**
 * Middleware to add talent ID to request body
 * @returns {Function} Express middleware function
 */
exports.addTalentIdToBody = (req, res, next) => {
  try {
    // Extract the user ID from the auth token (sub claim)
    const userId = req.auth?.payload?.sub;

    if (!userId) {
      logger.warn("No user ID found in auth token");
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Add talentId to the request body if not already set
    if (req.body && !req.body.talentId) {
      req.body.talentId = userId;
      logger.info(`Added talentId ${userId} to request body`);
    }

    next();
  } catch (error) {
    logger.error(`Error in addTalentIdToBody middleware: ${error.message}`, {
      stack: error.stack,
    });
    next(error);
  }
};

/**
 * Middleware to set user role in request object
 * @returns {Function} Express middleware function
 */
exports.setUserRole = () => {
  return (req, res, next) => {
    try {
      // Get roles from the Auth0 token payload
      const roles = req.auth?.payload?.["https://talentlink.com/roles"] || [];
      const userRole =
        req.auth?.payload?.["https://talentlink.com/role"] || null;

      // For debugging
      logger.info(
        `setUserRole: User ${req.auth?.payload?.sub} has roles ${JSON.stringify(
          roles
        )} and role ${userRole}`
      );

      // Determine if user is client or talent based on roles
      if (userRole) {
        req.userRole = userRole;
      } else if (roles.includes("client")) {
        req.userRole = "client";
      } else if (roles.includes("talent")) {
        req.userRole = "talent";
      } else if (roles.includes("admin")) {
        req.userRole = "admin";
      } else {
        req.userRole = "guest";
      }

      logger.info(`User role set to: ${req.userRole}`);
      next();
    } catch (error) {
      logger.error(`Error in setUserRole middleware: ${error.message}`, {
        stack: error.stack,
      });
      next(error);
    }
  };
};
