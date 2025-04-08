const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const { validateRequest } = require("../middlewares/validation.middleware");
const stripeService = require("../services/stripe.services");
const {
  cardPaymentSchema,
  customerSchema,
  paymentIntentSchema,
  refundSchema,
  connectedAccountSchema,
  transferSchema,
  subscriptionSchema,
} = require("../validators/payment.validator");

// Customer endpoints
router.post(
  "/customers",
  validateRequest(customerSchema),
  paymentController.createCustomer
);

router.post(
  "/milestone/intent",
  paymentController.createMilestonePaymentIntent
);
router.post("/milestone/capture", async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    // Optional: do some checks to ensure user is actually the project owner
    // or has permission to release funds, etc.

    const capturedIntent = await stripeService.captureMilestonePaymentIntent(
      paymentIntentId
    );

    res.json({
      success: true,
      data: capturedIntent,
    });
  } catch (error) {
    console.error("Error capturing milestone payment intent:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Payment intent endpoints
router.post(
  "/intent",
  validateRequest(paymentIntentSchema),
  paymentController.createPaymentIntent
);

// Refund endpoints
router.post(
  "/refund",
  validateRequest(refundSchema),
  paymentController.processRefund
);

// Connected accounts endpoints
router.post(
  "/connect/accounts",
  validateRequest(connectedAccountSchema),
  paymentController.createConnectedAccount
);

router.post("/connect/account-links", paymentController.createAccountLink);

router.get(
  "/connect/accounts/:accountId",
  paymentController.getConnectedAccount
);

router.post(
  "/connect/login-link/:accountId",
  paymentController.createLoginLink
);

// Payment methods endpoints
router.get("/payment-methods", paymentController.listPaymentMethods);

router.post("/payment-methods/attach", paymentController.attachPaymentMethod);

router.post(
  "/payment-methods/default",
  paymentController.updateDefaultPaymentMethod
);

// Transfer endpoints
router.post(
  "/transfers",
  validateRequest(transferSchema),
  paymentController.transferToConnectedAccount
);

// Subscription endpoints
router.post(
  "/subscriptions",
  validateRequest(subscriptionSchema),
  paymentController.createSubscription
);

router.delete(
  "/subscriptions/:subscriptionId",
  paymentController.cancelSubscription
);

// Product and price endpoints
router.post("/products", paymentController.createProduct);

router.post("/prices", paymentController.createPrice);

// Setup intent for saving payment details
router.post("/setup-intent", paymentController.createSetupIntent);

// Balance endpoints
router.get("/balance", paymentController.checkBalance);

router.get("/balance/:accountId", paymentController.checkConnectedBalance);

module.exports = router;
