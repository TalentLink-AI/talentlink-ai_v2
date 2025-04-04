const Payment = require("../models/payment.model");
const logger = require("../utils/logger");

/**
 * Repository class for payment operations
 */
class PaymentRepository {
  /**
   * Create a new payment record
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Created payment record
   */
  async create(paymentData) {
    try {
      const payment = new Payment(paymentData);
      return await payment.save();
    } catch (error) {
      logger.error(`Error creating payment record: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Find payment by ID
   * @param {string} id - Payment ID
   * @returns {Promise<Object>} Payment record
   */
  async findById(id) {
    try {
      return await Payment.findById(id);
    } catch (error) {
      logger.error(`Error finding payment by ID: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Find payment by Stripe payment intent ID
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise<Object>} Payment record
   */
  async findByPaymentIntentId(paymentIntentId) {
    try {
      return await Payment.findOne({ paymentIntentId });
    } catch (error) {
      logger.error(
        `Error finding payment by payment intent ID: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Find payment by Stripe charge ID
   * @param {string} chargeId - Stripe charge ID
   * @returns {Promise<Object>} Payment record
   */
  async findByChargeId(chargeId) {
    try {
      return await Payment.findOne({ chargeId });
    } catch (error) {
      logger.error(`Error finding payment by charge ID: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Find payments by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options (pagination, sorting)
   * @returns {Promise<Array>} Array of payment records
   */
  async findByUserId(userId, options = {}) {
    try {
      const { limit = 10, page = 1, sort = { createdAt: -1 } } = options;
      const skip = (page - 1) * limit;

      const payments = await Payment.find({ userId })
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await Payment.countDocuments({ userId });

      return {
        payments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`Error finding payments by user ID: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update payment by ID
   * @param {string} id - Payment ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated payment record
   */
  async updateById(id, updateData) {
    try {
      return await Payment.findByIdAndUpdate(id, updateData, { new: true });
    } catch (error) {
      logger.error(`Error updating payment: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update payment by payment intent ID
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated payment record
   */
  async updateByPaymentIntentId(paymentIntentId, updateData) {
    try {
      return await Payment.findOneAndUpdate({ paymentIntentId }, updateData, {
        new: true,
      });
    } catch (error) {
      logger.error(
        `Error updating payment by payment intent ID: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Update payment by charge ID
   * @param {string} chargeId - Stripe charge ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated payment record
   */
  async updateByChargeId(chargeId, updateData) {
    try {
      return await Payment.findOneAndUpdate({ chargeId }, updateData, {
        new: true,
      });
    } catch (error) {
      logger.error(`Error updating payment by charge ID: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Add refund to payment
   * @param {string} chargeId - Stripe charge ID
   * @param {Object} refundData - Refund data
   * @returns {Promise<Object>} Updated payment record
   */
  async addRefund(chargeId, refundData) {
    try {
      const payment = await Payment.findOne({ chargeId });

      if (!payment) {
        throw new Error(`Payment with charge ID ${chargeId} not found`);
      }

      // Add refund to refunds array
      payment.refunds.push(refundData);

      // Update refunded amount
      payment.refundedAmount += refundData.amount;

      // Update status
      if (payment.refundedAmount >= payment.amount) {
        payment.status = "refunded";
      } else if (payment.refundedAmount > 0) {
        payment.status = "partially_refunded";
      }

      return await payment.save();
    } catch (error) {
      logger.error(`Error adding refund to payment: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get payment statistics by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Payment statistics
   */
  async getStatsByUserId(userId) {
    try {
      const stats = await Payment.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            total: { $sum: "$amount" },
          },
        },
      ]);

      // Format the result in a more user-friendly way
      const result = {
        total: 0,
        succeeded: 0,
        failed: 0,
        refunded: 0,
        pending: 0,
        totalAmount: 0,
        successfulAmount: 0,
        refundedAmount: 0,
      };

      stats.forEach((stat) => {
        result.total += stat.count;
        result.totalAmount += stat.total;

        if (stat._id === "succeeded") {
          result.succeeded = stat.count;
          result.successfulAmount = stat.total;
        } else if (stat._id === "failed") {
          result.failed = stat.count;
        } else if (
          stat._id === "refunded" ||
          stat._id === "partially_refunded"
        ) {
          result.refunded += stat.count;
          result.refundedAmount += stat.total;
        } else if (stat._id === "pending") {
          result.pending = stat.count;
        }
      });

      return result;
    } catch (error) {
      logger.error(`Error getting payment stats: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }
  // Add this to your payment.repository.js file
  /**
   * Update payment by payment intent ID
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated payment record
   */
  async updateByPaymentIntentId(paymentIntentId, updateData) {
    try {
      return await Payment.findOneAndUpdate(
        { paymentIntentId: paymentIntentId },
        updateData,
        { new: true }
      );
    } catch (error) {
      logger.error(
        `Error updating payment by payment intent ID: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }
}

module.exports = new PaymentRepository();
