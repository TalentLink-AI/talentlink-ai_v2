// Replace or update backend/messaging-service/src/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const logger = require("../logger");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Configure middleware
app.use(
  cors({
    origin: "*", // In production, restrict this
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization"],
  },
  transports: ["websocket", "polling"], // Allow both websocket and polling
});

// Connect to MongoDB
const mongoUri =
  process.env.MONGODB_URI || "mongodb://mongodb:27017/talentlink";
mongoose
  .connect(mongoUri)
  .then(() => {
    logger.info(`Connected to MongoDB at ${mongoUri}`);
    console.log(`Connected to MongoDB at ${mongoUri}`);
  })
  .catch((err) => {
    logger.error(`MongoDB connection error: ${err}`);
    console.error("MongoDB connection error:", err);
  });

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date(),
    service: "messaging-service",
  });
});

// Debug endpoint
app.get("/debug/config", (req, res) => {
  res.status(200).json({
    service: "messaging-service",
    version: "1.0.0",
    env: process.env.NODE_ENV,
    authConfig: {
      domain: process.env.AUTH0_DOMAIN,
      audience: process.env.AUTH0_AUDIENCE,
      issuerBaseUrl: process.env.AUTH0_ISSUER_BASE_URL,
    },
    mongodb: {
      uri: mongoUri.replace(/mongodb:\/\/.*@/, "mongodb://[redacted]@"), // Hide credentials
    },
  });
});

// Log all requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Register routes
app.use("/api/chat", require("./routes/chat.routes"));

// Socket controller - load socket handlers
require("./controllers/socket.controller")(io);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  console.error("Unhandled error:", err);
  res.status(500).json({
    message: "An unexpected error occurred",
    error: process.env.NODE_ENV === "production" ? undefined : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: "Route not found" });
});

// Start server
const PORT = process.env.PORT || 3004;
server.listen(PORT, () => {
  logger.info(`📡 Messaging service running on port ${PORT}`);
  console.log(`📡 Messaging service running on port ${PORT}`);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
  console.error("Uncaught exception:", err);
  // Don't exit in development, but should exit in production after cleanup
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
});

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled rejection at ${promise}. Reason: ${reason}`);
  console.error("Unhandled rejection:", reason);
});

module.exports = { app, server };
