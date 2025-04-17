// backend/messaging-service/src/middlewares/auth.js

const { verifyToken } = require("../utils/auth0");
const logger = require("../../logger");

module.exports = async (req, res, next) => {
  try {
    // Log the request headers for debugging
    logger.info(`Auth headers: ${JSON.stringify(req.headers)}`);

    const authHeader = req.headers.authorization || "";
    const token = authHeader.split(" ")[1];

    logger.info(`Auth middleware processing request to ${req.originalUrl}`);

    if (!token || typeof token !== "string") {
      logger.error("Missing or invalid token format");
      return res
        .status(401)
        .json({ message: "Unauthorized: No valid token provided" });
    }

    try {
      // For development: attempt to decode token without verification first
      const jwt = require("jsonwebtoken");
      try {
        const decoded = jwt.decode(token);
        logger.info(
          `Token claims without verification: ${JSON.stringify({
            sub: decoded?.sub,
            iss: decoded?.iss,
            aud: decoded?.aud,
            exp: decoded?.exp
              ? new Date(decoded.exp * 1000).toISOString()
              : "not set",
          })}`
        );
      } catch (decodeErr) {
        logger.warn(`Could not decode token: ${decodeErr.message}`);
      }

      // Now verify the token properly
      const decoded = await verifyToken(token);

      if (!decoded || !decoded.sub) {
        logger.error("Token verification failed - no sub found");
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
      }

      // Store the decoded token in req.auth (Auth0 format)
      req.auth = { payload: decoded };
      logger.info(`Successfully authenticated user: ${decoded.sub}`);
      next();
    } catch (verifyError) {
      logger.error(`Token verification error: ${verifyError.message}`);

      // For debugging in dev environments, we can still proceed with the request
      // but let's only do this if explicitly enabled
      if (
        process.env.DEBUG_AUTH === "true" ||
        process.env.NODE_ENV === "development"
      ) {
        logger.warn("Proceeding despite auth failure (DEBUG_AUTH mode)");
        // Create a placeholder auth object
        req.auth = {
          payload: {
            sub: "debug-user",
            iss: "debug-issuer",
          },
        };
        next();
        return;
      }

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
