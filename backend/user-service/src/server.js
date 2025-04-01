require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const winston = require("winston");
const rateLimit = require("express-rate-limit");

// Import routes
const userRoutes = require("./routes/user.routes");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "user-service" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Add file transports in production
if (process.env.NODE_ENV === "production") {
  logger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    })
  );
  logger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
    })
  );
}

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan("combined"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Authentication rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many authentication attempts, please try again later.",
});
app.use("/login", authLimiter);

// Profile update rate limiter
const profileLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 40, // 20 updates per hour
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/users/profile", profileLimiter);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://mongodb:27017/talentlink", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    logger.info("Connected to MongoDB");
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    logger.error(`MongoDB connection error: ${err}`);
    console.error("MongoDB connection error:", err);
  });

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

const { auth } = require("express-oauth2-jwt-bearer");

// Always use the real Auth0 middleware
const authMiddleware = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  tokenSigningAlg: "RS256",
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ message: "Invalid token" });
  }

  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
  });
});

app.use("/api/users", authMiddleware, userRoutes);

// Start the server
app.listen(PORT, () => {
  logger.info(`User service listening on port ${PORT}`);
  console.log(`User service listening on port ${PORT}`);
});

module.exports = app;
