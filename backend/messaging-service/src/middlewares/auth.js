const { verifyToken } = require("../utils/auth0");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.split(" ")[1];

    if (!token || typeof token !== "string") {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    const decoded = await verifyToken(token);

    if (!decoded || !decoded.sub) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    req.auth = { payload: decoded };
    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err.message);
    return res
      .status(401)
      .json({ message: "Unauthorized: Token verification failed" });
  }
};
