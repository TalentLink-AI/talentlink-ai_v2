require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const winston = require("winston");
const { createProxyMiddleware } = require("http-proxy-middleware");
const csrf = require("csurf");
const cookieParser = require("cookie-parser");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "api-gateway" },
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

// Set up CSRF protection
app.use(cookieParser());
const csrfProtection = csrf({ cookie: true });

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
app.use(limiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Service routes
const serviceRoutes = [
  {
    path: "/api/users",
    target: process.env.USER_SERVICE_URL || "http://user-service:3001",
  },
  {
    path: "/api/payment",
    target: process.env.PAYMENT_SERVICE_URL || "http://payment-service:3002",
  },
  {
    path: "/api/webhooks",
    target: process.env.PAYMENT_SERVICE_URL || "http://payment-service:3002",
    noAuth: true, // Skip authentication for webhooks
  },
];

const { auth } = require("express-oauth2-jwt-bearer");

//Auth0 middleware
const authMiddleware = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  tokenSigningAlg: "RS256",
});

// Apply authentication to routes that require it
app.use((req, res, next) => {
  // Skip auth for health check and webhooks
  if (req.path === "/health" || req.path.startsWith("/api/webhooks")) {
    return next();
  }

  // Apply auth to all other API routes
  if (req.path.startsWith("/api/")) {
    return authMiddleware(req, res, next);
  }

  next();
});

// Apply to routes that handle state-changing operations
app.use("/api/users/profile", csrfProtection);

// Generate CSRF token endpoint
app.get("/api/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Configure proxy middleware
serviceRoutes.forEach(({ path, target, noAuth }) => {
  logger.info(`Setting up proxy for ${path} -> ${target}`);

  const proxyOptions = {
    target,
    changeOrigin: true,
    pathRewrite: {
      [`^${path}`]: "", // Remove the path prefix
    },
    logLevel: "warn",
    onError: (err, req, res) => {
      logger.error(`Proxy error: ${err.message}`);
      res.status(500).json({
        error: "Service Unavailable",
        message: "The requested service is currently unavailable",
      });
    },
  };

  // Special handling for webhook endpoints that need raw body
  if (path === "/api/webhooks") {
    proxyOptions.onProxyReq = (proxyReq, req, res) => {
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    };
  }

  app.use(path, createProxyMiddleware(proxyOptions));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
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
  logger.info(`API Gateway listening on port ${PORT}`);
  console.log(`API Gateway listening on port ${PORT}`);
});

module.exports = app;
