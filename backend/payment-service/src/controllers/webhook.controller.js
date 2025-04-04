// src/controllers/webhook.controller.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { STRIPE_CONFIG } = require("../config/app.config");
const logger = require("../utils/logger");

/**
 * Handle Stripe webhook events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.handleWebhook = async (req, res, next) => {
  const signature = req.headers["stripe-signature"];

  try {
    if (!signature) {
      return res.status(400).json({
        success: false,
        error: "Missing signature header",
      });
    }

    // Verify the webhook signature
    // req.body is now a Buffer (raw body) due to express.raw middleware
    const event = stripe.webhooks.constructEvent(
      req.body, // This is raw body from express.raw middleware
      signature,
      STRIPE_CONFIG.WEBHOOK_SECRET
    );

    // Log the event type
    logger.info(`Received webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "account.updated":
        await handleConnectedAccountUpdated(event.data.object);
        break;

      case "account.application.deauthorized":
        await handleConnectedAccountDeauthorized(event.data.object);
        break;

      case "payout.created":
      case "payout.paid":
      case "payout.failed":
        await handlePayoutEvent(event.data.object, event.type);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error(`Webhook error: ${error.message}`, { stack: error.stack });

    if (error.type === "StripeSignatureVerificationError") {
      return res.status(400).json({
        success: false,
        error: "Invalid signature",
      });
    }

    next(error);
  }
};

/**
 * Handle successful payment intent
 * @param {Object} paymentIntent - Stripe payment intent object
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  logger.info(`PaymentIntent succeeded: ${paymentIntent.id}`);

  // TODO: Update payment status in database
  // TODO: Trigger notifications to user and/or admin
  // TODO: Update order/invoice status in database
}

/**
 * Handle failed payment intent
 * @param {Object} paymentIntent - Stripe payment intent object
 */
async function handlePaymentIntentFailed(paymentIntent) {
  logger.warn(`PaymentIntent failed: ${paymentIntent.id}`);

  // TODO: Update payment status in database
  // TODO: Trigger notifications to user and/or admin
  // TODO: Update order/invoice status in database
}

/**
 * Handle refunded charge
 * @param {Object} charge - Stripe charge object
 */
async function handleChargeRefunded(charge) {
  logger.info(`Charge refunded: ${charge.id}`);

  // TODO: Update payment status in database
  // TODO: Trigger notifications to user and/or admin
  // TODO: Update order/invoice status in database
}

/**
 * Handle subscription created
 * @param {Object} subscription - Stripe subscription object
 */
async function handleSubscriptionCreated(subscription) {
  logger.info(`Subscription created: ${subscription.id}`);

  // TODO: Store subscription details in database
  // TODO: Trigger notifications to user and/or admin
}

/**
 * Handle subscription updated
 * @param {Object} subscription - Stripe subscription object
 */
async function handleSubscriptionUpdated(subscription) {
  logger.info(`Subscription updated: ${subscription.id}`);

  // TODO: Update subscription details in database
  // TODO: Trigger notifications if needed
}

/**
 * Handle subscription deleted
 * @param {Object} subscription - Stripe subscription object
 */
async function handleSubscriptionDeleted(subscription) {
  logger.info(`Subscription deleted: ${subscription.id}`);

  // TODO: Update subscription status in database
  // TODO: Trigger notifications to user and/or admin
}

/**
 * Handle connected account updated
 * @param {Object} account - Stripe account object
 */
async function handleConnectedAccountUpdated(account) {
  logger.info(`Connected account updated: ${account.id}`);

  // TODO: Update connected account details in database
  // TODO: Check for capability changes and update accordingly
}

/**
 * Handle connected account deauthorized
 * @param {Object} account - Stripe account object
 */
async function handleConnectedAccountDeauthorized(account) {
  logger.warn(`Connected account deauthorized: ${account.id}`);

  // TODO: Update connected account status in database
  // TODO: Trigger admin notification
}

/**
 * Handle payout events
 * @param {Object} payout - Stripe payout object
 * @param {string} eventType - Type of event
 */
async function handlePayoutEvent(payout, eventType) {
  logger.info(`Payout event ${eventType}: ${payout.id}`);

  // TODO: Update payout status in database
  // TODO: Trigger notifications if needed
}
