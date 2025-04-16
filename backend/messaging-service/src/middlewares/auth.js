// Replace or update your backend/messaging-service/src/middlewares/auth.js

const { verifyToken } = require("../utils/auth0");
const logger = require("../../logger");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.split(" ")[1];

    // Add debug logging
    logger.info(`Auth middleware processing request to ${req.originalUrl}`);

    if (!token || typeof token !== "string") {
      logger.error("Missing or invalid token format");
      return res
        .status(401)
        .json({ message: "Unauthorized: No valid token provided" });
    }

    try {
      const decoded = await verifyToken(token);

      if (!decoded || !decoded.sub) {
        logger.error("Token verification failed - no sub found");
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
      }

      // Store the decoded token in req.auth
      req.auth = { payload: decoded };
      logger.info(`Successfully authenticated user: ${decoded.sub}`);
      next();
    } catch (verifyError) {
      logger.error(`Token verification error: ${verifyError.message}`);
      return res
        .status(401)
        .json({ message: "Unauthorized: Token verification failed" });
    }
  } catch (err) {
    logger.error(`Auth middleware general error: ${err.message}`);
    return res
      .status(500)
      .json({ message: "Server error during authentication" });
  }
};
