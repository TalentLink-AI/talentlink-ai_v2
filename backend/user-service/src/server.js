require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const winston = require("winston");
const rateLimit = require("express-rate-limit");

// Import routes
const userRoutes = require("./routes/userRoutes");
const profileRoutes = require("./routes/profileRoutes");
const webhookRoutes = require("./routes/webhookRoutes");

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

// Connect to MongoDB
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://mongodb:27017/talentlink-users",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
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

// Development mode auth middleware for local testing
const developmentAuth = (req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    // Add a mock auth object for development
    req.auth = {
      sub: "mock-auth0-id",
      email: "dev@example.com",
    };
    return next();
  }
  // In production, this would use the real auth middleware
  return res.status(401).json({ message: "Authentication not configured" });
};

// Configure Auth0 JWT middleware conditionally
let checkJwt = developmentAuth;

// Only set up real Auth0 validation if the environment variables are present
if (process.env.AUTH0_AUDIENCE && process.env.AUTH0_ISSUER_BASE_URL) {
  try {
    const { auth } = require("express-oauth2-jwt-bearer");
    checkJwt = auth({
      audience: process.env.AUTH0_AUDIENCE,
      issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    });
    logger.info("Auth0 authentication configured successfully");
  } catch (error) {
    logger.warn(
      "Auth0 configuration error, using development auth mode:",
      error.message
    );
  }
}

// Public routes
app.use("/webhooks", webhookRoutes);

// Protected routes
app.use("/api/users", userRoutes);
app.use("/api/profiles", profileRoutes);

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

// Start the server
app.listen(PORT, () => {
  logger.info(`User service listening on port ${PORT}`);
  console.log(`User service listening on port ${PORT}`);
});

module.exports = app;
