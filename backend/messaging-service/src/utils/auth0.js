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
  timeout: 10000, // 10 second timeout
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
      logger.error(`Invalid token format: ${typeof token}`);
      return reject(new Error("Invalid token format"));
    }

    // Extract issuer and audience from token without verification first
    let decodedWithoutVerify;
    try {
      decodedWithoutVerify = jwt.decode(token);

      if (!decodedWithoutVerify) {
        logger.error("Token could not be decoded");
        return reject(new Error("Invalid token format - could not decode"));
      }
    } catch (decodeErr) {
      logger.error(`Could not decode token: ${decodeErr.message}`);
      return reject(new Error("Token decode failed"));
    }

    // Use the issuer from the token (if available) or fallback to env variable
    const tokenIssuer =
      decodedWithoutVerify?.iss || process.env.AUTH0_ISSUER_BASE_URL;
    const tokenAudience =
      decodedWithoutVerify?.aud ||
      process.env.AUTH0_AUDIENCE ||
      "https://api.talentlink.com";

    const options = {
      audience: tokenAudience,
      issuer: tokenIssuer,
      algorithms: ["RS256"],
    };

    logger.debug(`Verifying token with options: ${JSON.stringify(options)}`);

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
