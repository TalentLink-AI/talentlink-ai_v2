// backend/payment-service/src/services/milestone-payment.service.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const logger = require("../utils/logger");
const config = require("../config/app.config");
const paymentRepository = require("../repositories/payment.repository");
const transferRepository = require("../repositories/transfer.repository");

/**
 * MilestonePaymentService - Consolidated service for handling all milestone payment operations
 */
class MilestonePaymentService {
  /**
   * Create a payment intent for a milestone deposit
   * @param {Object} params - Payment parameters
   * @param {string} params.jobId - Job ID
   * @param {string} params.milestoneId - Milestone ID
   * @param {number} params.amount - Amount in dollars (will be converted to cents for Stripe)
   * @param {string} params.currency - Currency code (default: 'usd')
   * @param {string} params.payerId - ID of the client making the payment
   * @param {string} params.payeeId - ID of the talent receiving the payment
   * @param {string} params.description - Payment description
   * @returns {Promise<Object>} Stripe PaymentIntent object
   */
  async createDepositPaymentIntent(params) {
    try {
      logger.info(
        `Creating deposit payment intent for milestone ${params.milestoneId}`
      );

      // Create the payment intent with manual capture mode
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100), // Convert dollars to cents
        currency: params.currency || "usd",
        capture_method: "manual", // For escrow-style functionality
        metadata: {
          payerId: params.payerId,
          payeeId: params.payeeId,
          jobId: params.jobId,
          milestoneId: params.milestoneId,
          paymentType: "milestone_deposit",
        },
        description:
          params.description || `Deposit for milestone: ${params.milestoneId}`,
      });

      // Create payment record
      if (params.saveToDb !== false) {
        await paymentRepository.create({
          userId: params.payerId,
          payerId: params.payerId,
          payeeId: params.payeeId,
          stripeCustomerId: params.customerId || "no-customer",
          projectId: params.jobId,
          milestoneId: params.milestoneId,
          paymentIntentId: paymentIntent.id,
          amount: params.amount,
          currency: params.currency || "usd",
          paymentMethod: "card",
          status: "pending",
          description:
            params.description ||
            `Deposit for milestone: ${params.milestoneId}`,
        });
      }

      return paymentIntent;
    } catch (error) {
      logger.error(`Error creating deposit payment intent: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Create a payment intent for remaining milestone amount after completion
   * @param {Object} params - Payment parameters
   * @param {string} params.jobId - Job ID
   * @param {string} params.milestoneId - Milestone ID
   * @param {number} params.amount - Amount in dollars (will be converted to cents for Stripe)
   * @param {string} params.currency - Currency code (default: 'usd')
   * @param {string} params.payerId - ID of the client making the payment
   * @param {string} params.payeeId - ID of the talent receiving the payment
   * @param {string} params.description - Payment description
   * @returns {Promise<Object>} Stripe PaymentIntent object
   */
  async createRemainingPaymentIntent(params) {
    try {
      logger.info(
        `Creating remaining payment intent for milestone ${params.milestoneId}`
      );

      // Create the payment intent with manual capture mode
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100), // Convert dollars to cents
        currency: params.currency || "usd",
        capture_method: "manual", // For escrow-style functionality
        metadata: {
          payerId: params.payerId,
          payeeId: params.payeeId,
          jobId: params.jobId,
          milestoneId: params.milestoneId,
          paymentType: "milestone_remaining",
        },
        description:
          params.description ||
          `Remaining payment for milestone: ${params.milestoneId}`,
      });

      // Create payment record
      if (params.saveToDb !== false) {
        await paymentRepository.create({
          userId: params.payerId,
          payerId: params.payerId,
          payeeId: params.payeeId,
          stripeCustomerId: params.customerId || "no-customer",
          projectId: params.jobId,
          milestoneId: params.milestoneId,
          paymentIntentId: paymentIntent.id,
          amount: params.amount,
          currency: params.currency || "usd",
          paymentMethod: "card",
          status: "pending",
          description:
            params.description ||
            `Remaining payment for milestone: ${params.milestoneId}`,
        });
      }

      return paymentIntent;
    } catch (error) {
      logger.error(
        `Error creating remaining payment intent: ${error.message}`,
        {
          stack: error.stack,
        }
      );
      throw error;
    }
  }

  /**
   * Create a complete milestone payment intent (full amount)
   * @param {Object} params - Payment parameters
   * @param {string} params.jobId - Job ID
   * @param {string} params.milestoneId - Milestone ID
   * @param {number} params.amount - Amount in dollars (will be converted to cents for Stripe)
   * @param {string} params.currency - Currency code (default: 'usd')
   * @param {string} params.payerId - ID of the client making the payment
   * @param {string} params.payeeId - ID of the talent receiving the payment
   * @param {string} params.description - Payment description
   * @returns {Promise<Object>} Stripe PaymentIntent object
   */
  async createFullPaymentIntent(params) {
    try {
      logger.info(
        `Creating full payment intent for milestone ${params.milestoneId}`
      );

      // Create the payment intent with manual capture mode
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100), // Convert dollars to cents
        currency: params.currency || "usd",
        capture_method: "manual", // For escrow-style functionality
        metadata: {
          payerId: params.payerId,
          payeeId: params.payeeId,
          jobId: params.jobId,
          milestoneId: params.milestoneId,
          paymentType: "milestone_full",
        },
        description:
          params.description ||
          `Full payment for milestone: ${params.milestoneId}`,
      });

      // Create payment record
      if (params.saveToDb !== false) {
        await paymentRepository.create({
          userId: params.payerId,
          payerId: params.payerId,
          payeeId: params.payeeId,
          stripeCustomerId: params.customerId || "no-customer",
          projectId: params.jobId,
          milestoneId: params.milestoneId,
          paymentIntentId: paymentIntent.id,
          amount: params.amount,
          currency: params.currency || "usd",
          paymentMethod: "card",
          status: "pending",
          description:
            params.description ||
            `Full payment for milestone: ${params.milestoneId}`,
        });
      }

      return paymentIntent;
    } catch (error) {
      logger.error(`Error creating full payment intent: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Capture a payment intent (completes the payment)
   * @param {string} paymentIntentId - The ID of the payment intent to capture
   * @returns {Promise<Object>} The captured payment intent
   */
  async capturePaymentIntent(paymentIntentId) {
    try {
      logger.info(`Capturing payment intent: ${paymentIntentId}`);

      // First, retrieve the payment intent to get its metadata
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      if (!paymentIntent || paymentIntent.status !== "requires_capture") {
        throw new Error(
          `PaymentIntent ${paymentIntentId} cannot be captured. Status: ${paymentIntent?.status}`
        );
      }

      // "Finalize" the payment by capturing the authorized amount
      const capturedIntent = await stripe.paymentIntents.capture(
        paymentIntentId
      );

      // Update the DB record
      await paymentRepository.updateByPaymentIntentId(paymentIntentId, {
        status: capturedIntent.status,
      });

      return capturedIntent;
    } catch (error) {
      logger.error(`Error capturing payment intent: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Transfer funds from captured payment to talent's connected account
   * @param {Object} params - Transfer parameters
   * @param {string} params.paymentIntentId - Stripe payment intent ID that was captured
   * @param {string} params.connectedAccountId - Talent's Stripe connected account ID
   * @param {string} params.jobId - Job ID for reference
   * @param {string} params.milestoneId - Milestone ID for reference
   * @param {number} params.amount - Amount to transfer in dollars
   * @param {string} params.payeeId - ID of talent receiving payment
   * @returns {Promise<Object>} Stripe transfer object
   */
  async transferFundsToTalent(params) {
    try {
      logger.info(
        `Transferring funds to talent account: ${params.connectedAccountId}`
      );

      // Create a transfer from platform to the connected account
      const transfer = await stripe.transfers.create({
        amount: Math.round(params.amount * 100), // Convert to cents
        currency: "usd",
        destination: params.connectedAccountId,
        transfer_group: `job_${params.jobId}_milestone_${params.milestoneId}`,
        description:
          params.description || `Payment for milestone: ${params.milestoneId}`,
        metadata: {
          jobId: params.jobId,
          milestoneId: params.milestoneId,
          paymentType: "milestone_transfer",
          payeeId: params.payeeId,
          paymentIntentId: params.paymentIntentId,
        },
      });

      // Save transfer record in database
      if (params.saveToDb !== false) {
        await transferRepository.create({
          userId: params.payeeId,
          stripeTransferId: transfer.id,
          stripeAccountId: params.connectedAccountId,
          amount: params.amount,
          currency: "usd",
          description:
            params.description ||
            `Payment for milestone: ${params.milestoneId}`,
          status: "paid",
          sourceType: "payment",
          sourceId: params.milestoneId,
          metadata: {
            jobId: params.jobId,
            milestoneId: params.milestoneId,
            paymentIntentId: params.paymentIntentId,
          },
        });
      }

      return transfer;
    } catch (error) {
      logger.error(`Error transferring funds to talent: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Handle the full milestone payment flow in one method
   * @param {Object} params - All parameters needed for the payment flow
   * @returns {Promise<Object>} Result of the operation
   */
  async processMilestonePayment(params) {
    try {
      // Step 1: Create payment intent
      const paymentIntent = await this.createFullPaymentIntent(params);

      // Note: Full capture and transfer would typically happen after client confirmation
      // This method doesn't auto-capture since that would normally be triggered by
      // a webhook or client action

      return {
        success: true,
        paymentIntent,
        message:
          "Payment intent created successfully. Ready for capture after confirmation.",
      };
    } catch (error) {
      logger.error(`Error in milestone payment flow: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }
}

module.exports = new MilestonePaymentService();
