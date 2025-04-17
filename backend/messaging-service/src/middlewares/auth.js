// backend/messaging-service/src/middlewares/auth.js
const { verifyToken } = require("../utils/auth0");
const logger = require("../../logger");

module.exports = async (req, res, next) => {
  try {
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
      // Verify the token properly
      const decoded = await verifyToken(token);

      if (!decoded || !decoded.sub) {
        logger.error("Token verification failed - no sub found");
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
      }

      // Store the decoded token in req.auth (Auth0 format)
      req.auth = { payload: decoded };

      // Store user ID for easier access
      req.user = {
        sub: decoded.sub,
        email: decoded.email || "",
      };

      logger.info(`Successfully authenticated user: ${decoded.sub}`);
      next();
    } catch (verifyError) {
      logger.error(`Token verification error: ${verifyError.message}`);

      // For debugging in dev environments only
      if (
        process.env.NODE_ENV === "development" &&
        process.env.DEBUG_AUTH === "true"
      ) {
        logger.warn("Proceeding despite auth failure (DEBUG_AUTH mode)");
        req.auth = {
          payload: {
            sub: "debug-user",
            iss: "debug-issuer",
          },
        };
        req.user = { sub: "debug-user" };
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
