// backend/messaging-service/src/utils/auth0.js
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const logger = require("../../logger");

// Initialize jwks client
const client = jwksClient({
  jwksUri:
    process.env.AUTH0_JWKS_URI ||
    `${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

// Function to get the signing key
function getKey(header, callback) {
  if (!header || !header.kid) {
    logger.error("Invalid JWT header - missing kid");
    return callback(new Error("Invalid JWT header"));
  }

  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      logger.error(`Error getting signing key: ${err.message}`);
      return callback(err);
    }

    try {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    } catch (error) {
      logger.error(`Error extracting public key: ${error.message}`);
      callback(error);
    }
  });
}

exports.verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    if (!token || typeof token !== "string") {
      logger.error(`Invalid token passed to verifyToken: ${typeof token}`);
      return reject(new Error("Invalid token passed to verifyToken"));
    }

    // Debug token format
    logger.info(`Verifying token: ${token.substring(0, 10)}...`);

    // Extract issuer from token without verifying
    let decodedWithoutVerify;
    try {
      decodedWithoutVerify = jwt.decode(token);
      logger.info(`Decoded token issuer: ${decodedWithoutVerify?.iss}`);
    } catch (decodeErr) {
      logger.warn(
        `Could not decode token for issuer check: ${decodeErr.message}`
      );
    }

    // Use the issuer from the token itself (if available) or fallback to env variable
    const tokenIssuer =
      decodedWithoutVerify?.iss || process.env.AUTH0_ISSUER_BASE_URL;

    const options = {
      audience: process.env.AUTH0_AUDIENCE || "https://api.talentlink.com",
      issuer: tokenIssuer,
      algorithms: ["RS256"],
    };

    logger.info(`JWT verification options: ${JSON.stringify(options)}`);

    jwt.verify(token, getKey, options, (err, decoded) => {
      if (err) {
        logger.error(`JWT verification error: ${err.message}`);
        return reject(err);
      }

      if (!decoded || !decoded.sub) {
        logger.error("JWT verification succeeded but missing 'sub' claim");
        return reject(new Error("Invalid JWT - missing required claims"));
      }

      logger.info(`JWT verification successful for user: ${decoded.sub}`);
      resolve(decoded);
    });
  });
};
