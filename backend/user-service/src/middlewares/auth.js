module.exports = (req, res, next) => {
  if (!req.auth || !req.auth.payload || !req.auth.payload.sub) {
    return res
      .status(401)
      .json({ message: "Unauthorized: No valid Auth0 user found" });
  }
  next();
};
