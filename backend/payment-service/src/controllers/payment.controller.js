// backend/payment-service/src/controllers/payment.controller.js
const PaymentService = require("../services/payment.service");
const logger = require("../../logger");

// Create a new instance of the payment service
const paymentService = new PaymentService();

// Controller for payment-related endpoints
class PaymentController {
  /**
   * Create a payment method
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createPaymentMethod(req, res) {
    try {
      const { paymentMethodId } = req.body;
      const userId = req.auth.sub;

      if (!paymentMethodId) {
        return res
          .status(400)
          .json({ message: "Payment method ID is required" });
      }

      const paymentMethod = await paymentService.createPaymentMethod(
        userId,
        paymentMethodId
      );

      res.status(201).json(paymentMethod);
    } catch (error) {
      logger.error(`Error creating payment method: ${error.message}`, {
        error,
      });
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get user's payment methods
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPaymentMethods(req, res) {
    try {
      const userId = req.auth.sub;

      const paymentMethods = await paymentService.getPaymentMethods(userId);

      res.status(200).json(paymentMethods);
    } catch (error) {
      logger.error(`Error getting payment methods: ${error.message}`, {
        error,
      });
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Delete a payment method
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deletePaymentMethod(req, res) {
    try {
      const { paymentMethodId } = req.params;
      const userId = req.auth.sub;

      const result = await paymentService.deletePaymentMethod(
        userId,
        paymentMethodId
      );

      res.status(200).json(result);
    } catch (error) {
      logger.error(`Error deleting payment method: ${error.message}`, {
        error,
      });
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Create an escrow account for a contract
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createEscrowAccount(req, res) {
    try {
      const { contractId, amount } = req.body;

      if (!contractId || !amount) {
        return res
          .status(400)
          .json({ message: "Contract ID and amount are required" });
      }

      const escrowAccount = await paymentService.createEscrowAccount(
        contractId,
        amount
      );

      res.status(201).json(escrowAccount);
    } catch (error) {
      logger.error(`Error creating escrow account: ${error.message}`, {
        error,
      });
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Fund an escrow account
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async fundEscrowAccount(req, res) {
    try {
      const { escrowId } = req.params;
      const { paymentMethodId, amount } = req.body;
      const userId = req.auth.sub;

      if (!paymentMethodId || !amount) {
        return res
          .status(400)
          .json({ message: "Payment method ID and amount are required" });
      }

      const paymentIntent = await paymentService.fundEscrowAccount(
        escrowId,
        userId,
        paymentMethodId,
        amount
      );

      res.status(200).json(paymentIntent);
    } catch (error) {
      logger.error(`Error funding escrow account: ${error.message}`, { error });
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get escrow account balance
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getEscrowBalance(req, res) {
    try {
      const { escrowId } = req.params;

      const balance = await paymentService.getEscrowBalance(escrowId);

      res.status(200).json(balance);
    } catch (error) {
      logger.error(`Error getting escrow balance: ${error.message}`, { error });
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Release milestone payment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async releaseMilestonePayment(req, res) {
    try {
      const { contractId, milestoneId } = req.params;
      const userId = req.auth.sub;

      const milestone = await paymentService.releaseMilestonePayment(
        contractId,
        milestoneId,
        userId
      );

      res.status(200).json(milestone);
    } catch (error) {
      logger.error(`Error releasing milestone payment: ${error.message}`, {
        error,
      });
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get contract milestones
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getContractMilestones(req, res) {
    try {
      const { contractId } = req.params;

      const milestones = await paymentService.getContractMilestones(contractId);

      res.status(200).json(milestones);
    } catch (error) {
      logger.error(`Error getting contract milestones: ${error.message}`, {
        error,
      });
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Update milestone status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateMilestoneStatus(req, res) {
    try {
      const { contractId, milestoneId } = req.params;
      const { status } = req.body;
      const userId = req.auth.sub;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const milestone = await paymentService.updateMilestoneStatus(
        contractId,
        milestoneId,
        status,
        userId
      );

      res.status(200).json(milestone);
    } catch (error) {
      logger.error(`Error updating milestone status: ${error.message}`, {
        error,
      });
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Create time-based payment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createTimeBasedPayment(req, res) {
    try {
      const { contractId } = req.params;
      const { paymentMethodId, hours } = req.body;
      const userId = req.auth.sub;

      if (!paymentMethodId || !hours) {
        return res
          .status(400)
          .json({ message: "Payment method ID and hours are required" });
      }

      const paymentIntent = await paymentService.createTimeBasedPayment(
        contractId,
        userId,
        paymentMethodId,
        hours
      );

      res.status(200).json(paymentIntent);
    } catch (error) {
      logger.error(`Error creating time-based payment: ${error.message}`, {
        error,
      });
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get Connect account link
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getConnectAccountLink(req, res) {
    try {
      const userId = req.auth.sub;

      const accountLink = await paymentService.createConnectAccountLink(userId);

      res.status(200).json(accountLink);
    } catch (error) {
      logger.error(`Error getting Connect account link: ${error.message}`, {
        error,
      });
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Check Connect onboarding status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async checkConnectOnboardingStatus(req, res) {
    try {
      const userId = req.auth.sub;

      const status = await paymentService.checkConnectOnboardingStatus(userId);

      res.status(200).json(status);
    } catch (error) {
      logger.error(
        `Error checking Connect onboarding status: ${error.message}`,
        { error }
      );
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get transaction history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTransactionHistory(req, res) {
    try {
      const userId = req.auth.sub;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const transactions = await paymentService.getTransactionHistory(
        userId,
        page,
        limit
      );

      res.status(200).json(transactions);
    } catch (error) {
      logger.error(`Error getting transaction history: ${error.message}`, {
        error,
      });
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Handle Stripe webhook events
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async handleStripeWebhook(req, res) {
    const sig = req.headers["stripe-signature"];

    try {
      // Verify the webhook signature
      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.rawBody, // Raw body must be available
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        logger.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      switch (event.type) {
        case "payment_intent.succeeded":
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
        case "payment_intent.payment_failed":
          await this.handlePaymentIntentFailed(event.data.object);
          break;
        case "account.updated":
          await this.handleAccountUpdated(event.data.object);
          break;
        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      // Return a 200 response to acknowledge receipt of the event
      res.status(200).json({ received: true });
    } catch (error) {
      logger.error(`Error handling webhook: ${error.message}`, { error });
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Handle payment_intent.succeeded webhook event
   * @param {Object} paymentIntent - Stripe payment intent object
   * @returns {Promise<void>}
   */
  async handlePaymentIntentSucceeded(paymentIntent) {
    try {
      // Update the payment record in our database
      const payment = await Payment.findOne({
        paymentIntentId: paymentIntent.id,
      });

      if (payment) {
        payment.status = "succeeded";
        await payment.save();
      }

      // Update related transaction
      const transaction = await Transaction.findOne({
        paymentIntentId: paymentIntent.id,
      });

      if (transaction) {
        transaction.status = "completed";
        await transaction.save();
      }

      // If this is an escrow funding payment, update the escrow balance
      if (
        paymentIntent.metadata &&
        paymentIntent.metadata.type === "escrow_funding"
      ) {
        const escrowId = paymentIntent.metadata.escrowId;

        if (escrowId) {
          const escrowAccount = await EscrowAccount.findById(escrowId);

          if (escrowAccount) {
            // Calculate amount excluding platform fee
            const platformFeePercentage = 0.05;
            const platformFee = Math.round(
              paymentIntent.amount * platformFeePercentage
            );
            const amount = paymentIntent.amount - platformFee;

            escrowAccount.currentBalance += amount;
            await escrowAccount.save();
          }
        }
      }

      logger.info(`Payment intent succeeded: ${paymentIntent.id}`);
    } catch (error) {
      logger.error(
        `Error handling payment_intent.succeeded: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * Handle payment_intent.payment_failed webhook event
   * @param {Object} paymentIntent - Stripe payment intent object
   * @returns {Promise<void>}
   */
  async handlePaymentIntentFailed(paymentIntent) {
    try {
      // Update the payment record in our database
      const payment = await Payment.findOne({
        paymentIntentId: paymentIntent.id,
      });

      if (payment) {
        payment.status = "failed";
        await payment.save();
      }

      // Update related transaction
      const transaction = await Transaction.findOne({
        paymentIntentId: paymentIntent.id,
      });

      if (transaction) {
        transaction.status = "failed";
        await transaction.save();
      }

      logger.info(`Payment intent failed: ${paymentIntent.id}`);
    } catch (error) {
      logger.error(
        `Error handling payment_intent.payment_failed: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * Handle account.updated webhook event
   * @param {Object} account - Stripe account object
   * @returns {Promise<void>}
   */
  async handleAccountUpdated(account) {
    try {
      // Check if this is a connected account
      const user = await User.findOne({ stripeConnectedAccountId: account.id });

      if (!user) {
        return;
      }

      // Check if the account has completed onboarding
      if (account.details_submitted && account.charges_enabled) {
        // Update user record to indicate onboarding is complete
        user.metadata = user.metadata || {};
        user.metadata.stripeOnboardingComplete = true;
        await user.save();

        logger.info(
          `Connect account onboarding completed: ${account.id} for user ${user._id}`
        );
      }
    } catch (error) {
      logger.error(`Error handling account.updated: ${error.message}`, {
        error,
      });
    }
  }
}
