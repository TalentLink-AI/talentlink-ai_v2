module.exports = function internalAuth(req, res, next) {
  const incomingKey = req.headers["x-internal-api-key"];

  if (!incomingKey || incomingKey !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ message: "Unauthorized internal request" });
  }

  next();
};
