const stripeService = require("../services/stripe.services");

// Create a customer
exports.createCustomer = async (req, res, next) => {
  try {
    const customer = await stripeService.createCustomer(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a milestone PaymentIntent (escrow-style)
 */
exports.createMilestonePaymentIntent = async (req, res, next) => {
  try {
    const {
      amount,
      currency,
      payerId, // Client who pays
      payeeId, // Freelancer who receives
      projectId,
      milestoneId,
      description,
    } = req.body;

    // Validate required fields
    if (!amount || !payerId || !payeeId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        message: "Amount, payer ID and payee ID are required",
      });
    }

    const paymentIntent = await stripeService.createMilestonePaymentIntent({
      amount,
      currency,
      payerId,
      payeeId,
      projectId,
      milestoneId,
      description,
      userId: req.auth?.payload?.sub || payerId, // Current user ID from auth
    });

    res.status(201).json({ success: true, data: paymentIntent });
  } catch (error) {
    next(error);
  }
};

/**
 * Capture a milestone PaymentIntent once the milestone is done
 */
exports.captureMilestonePaymentIntent = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;
    const paymentIntent = await stripeService.captureMilestonePaymentIntent(
      paymentIntentId
    );
    res.status(200).json({ success: true, data: paymentIntent });
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
