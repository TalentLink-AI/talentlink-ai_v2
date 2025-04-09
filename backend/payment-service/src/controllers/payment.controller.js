// backend/payment-service/src/controllers/payment.controller.js
const milestonePaymentService = require("../services/milestone-payment.service");
const stripeService = require("../services/stripe.services");
const logger = require("../utils/logger");

/**
 * Create a milestone PaymentIntent (escrow-style)
 */
exports.createMilestonePaymentIntent = async (req, res, next) => {
  try {
    const {
      amount,
      currency = "usd",
      payerId, // Client who pays
      payeeId, // Freelancer who receives
      jobId,
      milestoneId,
      description,
      paymentType = "full", // "deposit", "remaining", or "full"
    } = req.body;

    // Validate required fields
    if (!jobId || !milestoneId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        message: "Job ID and Milestone ID are required",
      });
    }

    // Get user ID from auth token if available
    const userId = req.auth?.payload?.sub || payerId;

    let paymentIntent;

    // Use the appropriate service method based on payment type
    if (paymentType === "deposit") {
      paymentIntent = await milestonePaymentService.createDepositPaymentIntent({
        amount,
        currency,
        payerId: payerId || userId,
        payeeId,
        jobId,
        milestoneId,
        description: description || `Deposit for milestone: ${milestoneId}`,
        userId,
      });
    } else if (paymentType === "remaining") {
      paymentIntent =
        await milestonePaymentService.createRemainingPaymentIntent({
          amount,
          currency,
          payerId: payerId || userId,
          payeeId,
          jobId,
          milestoneId,
          description:
            description || `Remaining payment for milestone: ${milestoneId}`,
          userId,
        });
    } else {
      // Default to full payment
      paymentIntent = await milestonePaymentService.createFullPaymentIntent({
        amount,
        currency,
        payerId: payerId || userId,
        payeeId,
        jobId,
        milestoneId,
        description:
          description || `Full payment for milestone: ${milestoneId}`,
        userId,
      });
    }

    res.status(201).json({ success: true, data: paymentIntent });
  } catch (error) {
    logger.error(`Error creating milestone payment intent: ${error.message}`, {
      stack: error.stack,
    });
    next(error);
  }
};

/**
 * Capture a milestone PaymentIntent once the milestone is done
 */
exports.captureMilestonePaymentIntent = async (req, res, next) => {
  try {
    const { paymentIntentId, jobId, milestoneId, paymentType } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field",
        message: "Payment intent ID is required",
      });
    }

    const capturedIntent = await milestonePaymentService.capturePaymentIntent(
      paymentIntentId
    );

    // Return more information when appropriate
    if (jobId && milestoneId) {
      // This is a payment for a specific milestone
      return res.status(200).json({
        success: true,
        data: {
          paymentIntent: capturedIntent,
          jobId,
          milestoneId,
          paymentType,
        },
      });
    }

    res.status(200).json({ success: true, data: capturedIntent });
  } catch (error) {
    logger.error(`Error capturing milestone payment intent: ${error.message}`, {
      stack: error.stack,
    });
    next(error);
  }
};

/**
 * Transfer funds to talent's connected account
 */
exports.transferFundsToTalent = async (req, res, next) => {
  try {
    const {
      paymentIntentId,
      connectedAccountId,
      jobId,
      milestoneId,
      amount,
      payeeId,
      description,
    } = req.body;

    // Validate the minimum required fields
    if (!jobId || !milestoneId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        message: "Job ID and Milestone ID are required",
      });
    }

    // Get payment and talent information if not directly provided
    let transferParams = { ...req.body };

    // If we're missing key information, we need to fetch it
    if (!paymentIntentId || !connectedAccountId || !amount || !payeeId) {
      // In a real implementation, you would fetch this information
      // from your database or another service
      logger.warn(
        "Missing transfer parameters - would fetch from DB in production"
      );

      // For now, return an error
      return res.status(400).json({
        success: false,
        error: "Missing required transfer information",
        message: "Unable to complete transfer with the provided information",
      });
    }

    const transfer = await milestonePaymentService.transferFundsToTalent(
      transferParams
    );

    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    logger.error(`Error transferring funds to talent: ${error.message}`, {
      stack: error.stack,
    });
    next(error);
  }
};

// Create a customer
exports.createCustomer = async (req, res, next) => {
  try {
    const customer = await stripeService.createCustomer(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// Create payment intent
exports.createPaymentIntent = async (req, res, next) => {
  try {
    const paymentIntent = await stripeService.createPaymentIntent(req.body);
    res.status(201).json({ success: true, data: paymentIntent });
  } catch (error) {
    next(error);
  }
};

// Process refund
exports.processRefund = async (req, res, next) => {
  try {
    const { chargeId, amount } = req.body;
    const refund = await stripeService.processRefund(chargeId, amount);
    res.status(200).json({ success: true, data: refund });
  } catch (error) {
    next(error);
  }
};

// Create connected account
exports.createConnectedAccount = async (req, res, next) => {
  try {
    const account = await stripeService.createConnectedAccount(req.body);
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

// Create account link
exports.createAccountLink = async (req, res, next) => {
  try {
    const accountLink = await stripeService.createAccountLink(req.body);
    res.status(201).json({ success: true, data: accountLink });
  } catch (error) {
    next(error);
  }
};

// Get connected account
exports.getConnectedAccount = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const account = await stripeService.retrieveConnectedAccount(accountId);
    res.status(200).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

// Create login link
exports.createLoginLink = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const loginLink = await stripeService.createLoginLink(accountId);
    res.status(201).json({ success: true, data: loginLink });
  } catch (error) {
    next(error);
  }
};

// List payment methods
exports.listPaymentMethods = async (req, res, next) => {
  try {
    const { customerId, type, limit } = req.query;
    const paymentMethods = await stripeService.listPaymentMethods({
      customerId,
      type,
      limit: limit ? parseInt(limit) : undefined,
    });
    res.status(200).json({ success: true, data: paymentMethods });
  } catch (error) {
    next(error);
  }
};

// Attach payment method
exports.attachPaymentMethod = async (req, res, next) => {
  try {
    const { paymentMethodId, customerId } = req.body;
    const paymentMethod = await stripeService.attachPaymentMethod(
      paymentMethodId,
      customerId
    );
    res.status(200).json({ success: true, data: paymentMethod });
  } catch (error) {
    next(error);
  }
};

// Update default payment method
exports.updateDefaultPaymentMethod = async (req, res, next) => {
  try {
    const { customerId, paymentMethodId } = req.body;
    const customer = await stripeService.updateDefaultPaymentMethod(
      customerId,
      paymentMethodId
    );
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// Transfer to connected account
exports.transferToConnectedAccount = async (req, res, next) => {
  try {
    const transfer = await stripeService.transferToConnectedAccount(req.body);
    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
};

// Create subscription
exports.createSubscription = async (req, res, next) => {
  try {
    const { transferId, ...params } = req.body;
    const subscription = await stripeService.createSubscription(
      params,
      transferId
    );
    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await stripeService.cancelSubscription(subscriptionId);
    res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
};

// Create product
exports.createProduct = async (req, res, next) => {
  try {
    const product = await stripeService.createProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// Create price
exports.createPrice = async (req, res, next) => {
  try {
    const price = await stripeService.createPrice(req.body);
    res.status(201).json({ success: true, data: price });
  } catch (error) {
    next(error);
  }
};

// Create setup intent
exports.createSetupIntent = async (req, res, next) => {
  try {
    const setupIntent = await stripeService.createSetupIntent(req.body);
    res.status(201).json({ success: true, data: setupIntent });
  } catch (error) {
    next(error);
  }
};

// Check balance
exports.checkBalance = async (req, res, next) => {
  try {
    const balance = await stripeService.checkBalance({});
    res.status(200).json({ success: true, data: balance });
  } catch (error) {
    next(error);
  }
};

// Check connected account balance
exports.checkConnectedBalance = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const balance = await stripeService.checkBalance({
      connected_acct_id: accountId,
    });
    res.status(200).json({ success: true, data: balance });
  } catch (error) {
    next(error);
  }
};
