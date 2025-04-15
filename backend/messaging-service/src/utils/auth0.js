// common/utils/auth0.js
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const client = jwksClient({
  jwksUri: process.env.AUTH0_JWKS_URI,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

exports.verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    if (!token || typeof token !== "string") {
      return reject(new Error("Invalid token passed to verifyToken"));
    }

    jwt.verify(
      token,
      getKey,
      {
        audience: process.env.AUTH0_AUDIENCE,
        issuer: process.env.AUTH0_ISSUER_BASE_URL,
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });
};
