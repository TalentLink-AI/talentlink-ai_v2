const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const config = require("../config/app.config");
const logger = require("../utils/logger");

// Import repositories
const customerRepository = require("../repositories/customer.repository");
const paymentRepository = require("../repositories/payment.repository");
const subscriptionRepository = require("../repositories/subscription.repository");
const connectedAccountRepository = require("../repositories/connected-account.repository");
const transferRepository = require("../repositories/transfer.repository");

/**
 * Create a Stripe customer
 * @param {Object} params - Customer information
 * @param {string} params.email - Customer email
 * @param {string} params.name - Customer name
 * @param {string} params.userId - User ID in our system
 * @returns {Promise<Object>} Stripe customer object and database record
 */
exports.createCustomer = async (params) => {
  try {
    // Check if customer already exists for this user
    if (params.userId) {
      const existingCustomer = await customerRepository.findByUserId(
        params.userId
      );
      if (existingCustomer) {
        // Retrieve the customer from Stripe to ensure we have the latest data
        const stripeCustomer = await stripe.customers.retrieve(
          existingCustomer.stripeCustomerId
        );
        return {
          stripeCustomer,
          dbCustomer: existingCustomer,
        };
      }
    }

    // Create the customer in Stripe
    const stripeCustomer = await stripe.customers.create({
      email: params.email,
      name: params.name,
      address: params.address
        ? {
            line1: params.address.line1,
            city: params.address.city,
            country: params.address.country || "US",
          }
        : undefined,
      metadata: {
        userId: params.userId,
      },
    });

    // Only store in our database if userId is provided
    if (params.userId) {
      // Store customer in our database
      const dbCustomer = await customerRepository.create({
        userId: params.userId,
        stripeCustomerId: stripeCustomer.id,
        email: params.email,
        name: params.name,
        address: params.address,
        paymentMethods: [],
      });

      return { stripeCustomer, dbCustomer };
    }

    return { stripeCustomer, dbCustomer: null };
  } catch (error) {
    logger.error(`Error creating Stripe customer: ${error.message}`, {
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Create a PaymentIntent for a milestone/escrow flow (manual capture)
 * @param {Object} params
 * @param {string} params.customerId - Stripe Customer ID
 * @param {number} params.amount - Amount to charge
 * @param {string} params.currency - Currency (default: 'usd')
 * @param {string} [params.connectedAccountId] - (Optional) The freelancer’s Stripe Account ID
 * @param {string} [params.description] - Description for metadata
 * @returns {Promise<Object>} PaymentIntent object
 */
exports.createMilestonePaymentIntent = async (params) => {
  try {
    // Create the payment intent in Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency || "usd",
      customer: params.customerId,
      capture_method: "manual", // For escrow-style functionality
      metadata: {
        payerId: params.payerId,
        payeeId: params.payeeId,
        projectId: params.projectId,
        milestoneId: params.milestoneId,
      },
    });

    // Check if we need to save to database
    if (params.saveToDb !== false) {
      // Create payment record with all required fields properly set
      await paymentRepository.create({
        userId: params.userId,
        payerId: params.payerId,
        payeeId: params.payeeId,
        stripeCustomerId: params.customerId || "no-customer",
        projectId: params.projectId,
        milestoneId: params.milestoneId,
        paymentIntentId: paymentIntent.id,
        amount: params.amount,
        currency: params.currency || "usd",
        paymentMethod: "card",
        status: "pending",
        description: params.description || "Milestone payment",
      });
    }

    return paymentIntent;
  } catch (error) {
    logger.error(`Error creating milestone PaymentIntent: ${error.message}`, {
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Capture a PaymentIntent once the milestone is complete
 * @param {string} paymentIntentId - The ID of the PaymentIntent to capture
 * @returns {Promise<Object>} Captured PaymentIntent
 */
exports.captureMilestonePaymentIntent = async (paymentIntentId) => {
  try {
    // "Finalize" the payment
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

    // Update the DB record
    await paymentRepository.updateByPaymentIntentId(paymentIntentId, {
      status: paymentIntent.status,
    });

    return paymentIntent;
  } catch (error) {
    logger.error(`Error capturing milestone PaymentIntent: ${error.message}`, {
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Process a refund
 * @param {string} chargeId - Stripe charge ID
 * @param {number} refundAmount - Amount to refund in dollars
 * @param {string} reason - Reason for refund (optional)
 * @returns {Promise<Object>} Refund object
 */
exports.processRefund = async (chargeId, refundAmount, reason = null) => {
  try {
    // Create the refund in Stripe
    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount: Math.round(refundAmount * 100),
      reason: reason || "requested_by_customer",
    });

    // Update our database if the payment exists
    const dbPayment = await paymentRepository.findByChargeId(chargeId);
    if (dbPayment) {
      await paymentRepository.addRefund(chargeId, {
        refundId: refund.id,
        amount: refundAmount,
        reason: reason || "requested_by_customer",
        status: refund.status,
        createdAt: new Date(),
      });
    }

    return {
      stripeRefund: refund,
      dbPayment: dbPayment,
    };
  } catch (error) {
    logger.error(`Error processing refund: ${error.message}`, {
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Create a tax rate
 * @param {number} percent - Tax percentage
 * @returns {Promise<Object>} Tax rate object
 */
exports.createTaxRate = async (percent) => {
  try {
    const taxRate = await stripe.taxRates.create({
      display_name: "Sales Tax",
      inclusive: false,
      percentage: percent,
      country: "US",
      state: "CA",
      jurisdiction: "US - CA",
      description: "CA Sales Tax",
    });

    return taxRate;
  } catch (error) {
    console.error("Error creating tax rate:", error);
    throw error;
  }
};

/**
 * Create a connected account for a platform merchant
 * @param {Object} params - Account parameters
 * @param {string} params.email - Account email
 * @param {string} params.country - Account country (default: 'US')
 * @param {string} params.userId - User ID in our system
 * @returns {Promise<Object>} Connected account object
 */
exports.createConnectedAccount = async (params) => {
  try {
    // Check if a connected account already exists for this user
    if (params.userId) {
      const existingAccount = await connectedAccountRepository.findByUserId(
        params.userId
      );
      if (existingAccount) {
        // Retrieve the account from Stripe to ensure we have the latest data
        const stripeAccount = await stripe.accounts.retrieve(
          existingAccount.stripeAccountId
        );
        return {
          stripeAccount,
          dbAccount: existingAccount,
        };
      }
    }

    // Create the account in Stripe
    const stripeAccount = await stripe.accounts.create({
      type: "express",
      country: params.country || "US",
      email: params.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        userId: params.userId,
      },
    });

    // Store in our database if userId is provided
    let dbAccount = null;
    if (params.userId) {
      dbAccount = await connectedAccountRepository.create({
        userId: params.userId,
        stripeAccountId: stripeAccount.id,
        email: params.email,
        country: params.country || "US",
        isActive: true,
        isSetupComplete: false,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        capabilities: {
          card_payments:
            stripeAccount.capabilities?.card_payments || "inactive",
          transfers: stripeAccount.capabilities?.transfers || "inactive",
        },
        defaultCurrency: stripeAccount.default_currency || "usd",
      });
    }

    return { stripeAccount, dbAccount };
  } catch (error) {
    logger.error(`Error creating connected account: ${error.message}`, {
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Create an account link for onboarding
 * @param {Object} params - Account link parameters
 * @param {string} params.account_id - Stripe account ID
 * @param {string} params.refresh_url - URL to redirect on failure
 * @param {string} params.return_url - URL to redirect on success
 * @returns {Promise<Object>} Account link object
 */
exports.createAccountLink = async (params) => {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: params.account_id,
      refresh_url: params.refresh_url,
      return_url: params.return_url,
      type: "account_onboarding",
    });

    return accountLink;
  } catch (error) {
    console.error("Error creating account link:", error);
    throw error;
  }
};

/**
 * Get a login link for a connected account
 * @param {string} accountId - Stripe account ID
 * @returns {Promise<Object>} Login link object
 */
exports.createLoginLink = async (accountId) => {
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink;
  } catch (error) {
    console.error("Error creating login link:", error);
    throw error;
  }
};

/**
 * Retrieve a connected account
 * @param {string} accountId - Stripe account ID
 * @returns {Promise<Object>} Account object
 */
exports.retrieveConnectedAccount = async (accountId) => {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account;
  } catch (error) {
    console.error("Error retrieving account:", error);
    throw error;
  }
};

/**
 * Transfer funds to a connected account
 * @param {Object} params - Transfer parameters
 * @param {number} params.amount - Amount to transfer in dollars
 * @param {string} params.connectedId - Destination connected account ID
 * @returns {Promise<Object>} Transfer object
 */
exports.transferToConnectedAccount = async (params) => {
  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(params.amount * 100),
      currency: config.STRIPE_CONFIG.CURRENCY || "usd",
      destination: params.connectedId,
    });

    return transfer;
  } catch (error) {
    console.error("Error transferring to connected account:", error);
    throw error;
  }
};

/**
 * Create a subscription
 * @param {Object} params - Subscription parameters
 * @param {string} params.customerId - Customer ID
 * @param {string} params.priceId - Price ID
 * @param {string} params.payment_method_id - Payment method ID
 * @param {number} params.start_date - Start timestamp
 * @param {string} params.transferId - Connected account ID (optional)
 * @returns {Promise<Object>} Subscription object
 */
exports.createSubscription = async (params, transferId) => {
  try {
    const subscriptionParams = {
      customer: params.customerId,
      default_payment_method: params.payment_method_id,
      payment_settings: { save_default_payment_method: "on_subscription" },
      items: [
        {
          price: params.priceId,
        },
      ],
    };

    // Add trial period if provided
    if (params.start_date) {
      subscriptionParams.trial_end = params.start_date;
    }

    // Add transfer data if provided
    if (transferId) {
      subscriptionParams.transfer_data = {
        destination: transferId,
        amount_percent: params.amount_percent || 85,
      };
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    return subscription;
  } catch (error) {
    console.error("Error creating subscription:", error);
    throw error;
  }
};

/**
 * Cancel a subscription
 * @param {string} subscriptionId - Subscription ID
 * @returns {Promise<Object>} Canceled subscription object
 */
exports.cancelSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  } catch (error) {
    console.error("Error canceling subscription:", error);
    throw error;
  }
};

/**
 * Check Stripe balance
 * @param {Object} params - Parameters
 * @param {string} params.connected_acct_id - Connected account ID (optional)
 * @returns {Promise<Object>} Balance object
 */
exports.checkBalance = async (params) => {
  try {
    if (params && params.connected_acct_id) {
      return await stripe.balance.retrieve({
        stripeAccount: params.connected_acct_id,
      });
    } else {
      return await stripe.balance.retrieve();
    }
  } catch (error) {
    console.error("Error checking balance:", error);
    throw error;
  }
};

/**
 * Create a product
 * @param {Object} params - Product parameters
 * @param {string} params.name - Product name
 * @returns {Promise<Object>} Product object
 */
exports.createProduct = async (params) => {
  try {
    const product = await stripe.products.create({
      name: params.name,
    });

    return product;
  } catch (error) {
    console.error("Error creating product:", error);
    throw error;
  }
};

/**
 * Create a price
 * @param {Object} params - Price parameters
 * @param {number} params.unit_amount - Amount in dollars
 * @param {string} params.job_name - Product name
 * @param {string} params.interval - Billing interval (default: 'week')
 * @returns {Promise<Object>} Price object
 */
exports.createPrice = async (params) => {
  try {
    const price = await stripe.prices.create({
      unit_amount: Math.round(params.unit_amount * 100),
      currency: config.STRIPE_CONFIG.CURRENCY || "usd",
      product_data: {
        name: params.job_name,
      },
      recurring: {
        interval: params.interval || "week",
      },
    });

    return price;
  } catch (error) {
    console.error("Error creating price:", error);
    throw error;
  }
};

/**
 * Attach a payment method to a customer
 * @param {string} paymentMethodId - Payment method ID
 * @param {string} customerId - Customer ID
 * @returns {Promise<Object>} Payment method object
 */
exports.attachPaymentMethod = async (paymentMethodId, customerId) => {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    return paymentMethod;
  } catch (error) {
    console.error("Error attaching payment method:", error);
    throw error;
  }
};

/**
 * Set a default payment method for a customer
 * @param {string} customerId - Customer ID
 * @param {string} paymentMethodId - Payment method ID
 * @returns {Promise<Object>} Updated customer object
 */
exports.updateDefaultPaymentMethod = async (customerId, paymentMethodId) => {
  try {
    const customer = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return customer;
  } catch (error) {
    console.error("Error updating default payment method:", error);
    throw error;
  }
};

/**
 * List payment methods for a customer
 * @param {Object} params - List parameters
 * @param {string} params.customerId - Customer ID
 * @param {string} params.type - Payment method type (default: 'card')
 * @param {number} params.limit - Number of payment methods to return (default: 3)
 * @returns {Promise<Object>} Payment methods list
 */
exports.listPaymentMethods = async (params) => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: params.customerId,
      type: params.type || "card",
      limit: params.limit || 3,
    });

    return paymentMethods;
  } catch (error) {
    console.error("Error listing payment methods:", error);
    throw error;
  }
};

/**
 * Create a setup intent for saving payment details
 * @param {Object} params - Setup intent parameters
 * @param {string} params.customerId - Customer ID
 * @returns {Promise<Object>} Setup intent object
 */
exports.createSetupIntent = async (params) => {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: params.customerId,
      usage: params.usage || "off_session",
      automatic_payment_methods: { enabled: true },
    });

    return setupIntent;
  } catch (error) {
    console.error("Error creating setup intent:", error);
    throw error;
  }
};

/**
 * Capture a PaymentIntent once the milestone is complete
 * @param {string} paymentIntentId - The ID of the PaymentIntent to capture
 * @returns {Promise<Object>} Captured PaymentIntent
 */
exports.captureMilestonePaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

    // Update DB status - use the correct repository method
    // Looking at your error, updateStatusByIntentId doesn't exist
    // Instead, use updateByPaymentIntentId which likely exists in your repo
    await paymentRepository.updateByPaymentIntentId(paymentIntentId, {
      status: paymentIntent.status,
    });

    return paymentIntent;
  } catch (error) {
    logger.error(`Error capturing milestone PaymentIntent: ${error.message}`, {
      stack: error.stack,
    });
    throw error;
  }
};
