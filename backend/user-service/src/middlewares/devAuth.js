/**
 * Development authentication middleware
 * This is a placeholder to use during development before Auth0 is fully configured
 */
const developmentAuth = (req, res, next) => {
  // In development, we'll just add a mock user to the request
  req.auth = {
    sub: "auth0|dev-123456789",
    email: "developer@talentlink.com",
    // Add any other properties your application expects from Auth0
    [process.env.AUTH0_AUDIENCE + "/email"]: "developer@talentlink.com",
    [process.env.AUTH0_AUDIENCE + "/roles"]: ["client"],
  };

  console.log("Using development auth middleware");
  next();
};

module.exports = developmentAuth;
