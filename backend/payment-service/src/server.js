require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// Import routes
const paymentRoutes = require("./routes/payment.routes");
const webhookRoutes = require("./routes/webhook.routes");

// Import logger and database connection
const logger = require("./utils/logger");
const connectDB = require("./config/db.config");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Connect to MongoDB
connectDB()
  .then(() => {
    logger.info("Connected to MongoDB");
  })
  .catch((err) => {
    logger.error(`Error connecting to MongoDB: ${err.message}`, {
      stack: err.stack,
    });
    process.exit(1);
  });

// Middleware for normal routes
const standardMiddleware = [
  cors(),
  helmet(),
  express.json(),
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
];

// Apply standard middleware to all routes except webhook
app.use((req, res, next) => {
  if (req.path === "/api/webhooks/stripe") {
    // For webhooks, we need raw body for signature verification
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    // Apply all standard middleware for non-webhook routes
    const applyMiddleware = (i) => {
      if (i < standardMiddleware.length) {
        standardMiddleware[i](req, res, () => applyMiddleware(i + 1));
      } else {
        next();
      }
    };
    applyMiddleware(0);
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Payment endpoint rate limiter
const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 payment attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many payment attempts, please try again later.",
});
app.use("/api/payment/process", paymentLimiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Routes
app.use("/api/payment", paymentRoutes);
app.use("/api/webhooks", webhookRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });

  if (err.type === "StripeCardError") {
    return res.status(400).json({
      success: false,
      error: "Payment Error",
      message: err.message,
    });
  }

  if (err.type === "StripeInvalidRequestError") {
    return res.status(400).json({
      success: false,
      error: "Invalid Request",
      message: err.message,
    });
  }

  if (err.type === "StripeConnectionError") {
    return res.status(503).json({
      success: false,
      error: "Service Unavailable",
      message:
        "Unable to connect to payment service provider. Please try again later.",
    });
  }

  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong processing your payment"
        : err.message,
  });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Payment service listening on port ${PORT}`);
  console.log(`Payment service listening on port ${PORT}`);
});

module.exports = app;
