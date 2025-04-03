// backend/payment-service/src/routes/payment.routes.js
const express = require("express");
const PaymentController = require("../controllers/payment.controller");
const { auth } = require("express-oauth2-jwt-bearer");
const router = express.Router();

// Initialize auth middleware
const authMiddleware = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  tokenSigningAlg: "RS256",
});

// Initialize the payment controller
const paymentController = new PaymentController();

// Middleware to capture the raw body for Stripe webhooks
const rawBodyMiddleware = (req, res, next) => {
  if (req.originalUrl === "/api/payments/webhook" && req.method === "POST") {
    let data = "";
    req.setEncoding("utf8");

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      req.rawBody = data;
      next();
    });
  } else {
    next();
  }
};

// Apply raw body middleware
router.use(rawBodyMiddleware);

// Public webhook route (no auth required)
router.post(
  "/webhook",
  paymentController.handleStripeWebhook.bind(paymentController)
);

// All routes below this point require authentication
router.use(authMiddleware);

// Payment Method routes
router.post(
  "/payment-methods",
  paymentController.createPaymentMethod.bind(paymentController)
);
router.get(
  "/payment-methods",
  paymentController.getPaymentMethods.bind(paymentController)
);
router.delete(
  "/payment-methods/:paymentMethodId",
  paymentController.deletePaymentMethod.bind(paymentController)
);

// Escrow routes
router.post(
  "/escrow",
  paymentController.createEscrowAccount.bind(paymentController)
);
router.post(
  "/escrow/:escrowId/fund",
  paymentController.fundEscrowAccount.bind(paymentController)
);
router.get(
  "/escrow/:escrowId/balance",
  paymentController.getEscrowBalance.bind(paymentController)
);

// Milestone routes
router.get(
  "/contracts/:contractId/milestones",
  paymentController.getContractMilestones.bind(paymentController)
);
router.patch(
  "/contracts/:contractId/milestones/:milestoneId",
  paymentController.updateMilestoneStatus.bind(paymentController)
);
router.post(
  "/contracts/:contractId/milestones/:milestoneId/release",
  paymentController.releaseMilestonePayment.bind(paymentController)
);

// Time-based payment routes
router.post(
  "/contracts/:contractId/time-payment",
  paymentController.createTimeBasedPayment.bind(paymentController)
);

// Stripe Connect routes
router.get(
  "/connect/account-link",
  paymentController.getConnectAccountLink.bind(paymentController)
);
router.get(
  "/connect/status",
  paymentController.checkConnectOnboardingStatus.bind(paymentController)
);

// Transaction history
router.get(
  "/transactions",
  paymentController.getTransactionHistory.bind(paymentController)
);

module.exports = router;
