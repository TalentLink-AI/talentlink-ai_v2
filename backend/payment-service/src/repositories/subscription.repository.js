const Subscription = require("../models/subscription.model");
const logger = require("../utils/logger");

/**
 * Repository class for subscription operations
 */
class SubscriptionRepository {
  /**
   * Create a new subscription record
   * @param {Object} subscriptionData - Subscription data
   * @returns {Promise<Object>} Created subscription record
   */
  async create(subscriptionData) {
    try {
      const subscription = new Subscription(subscriptionData);
      return await subscription.save();
    } catch (error) {
      logger.error(`Error creating subscription record: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Find subscription by ID
   * @param {string} id - Subscription ID
   * @returns {Promise<Object>} Subscription record
   */
  async findById(id) {
    try {
      return await Subscription.findById(id);
    } catch (error) {
      logger.error(`Error finding subscription by ID: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Find subscription by Stripe subscription ID
   * @param {string} stripeSubscriptionId - Stripe subscription ID
   * @returns {Promise<Object>} Subscription record
   */
  async findByStripeSubscriptionId(stripeSubscriptionId) {
    try {
      return await Subscription.findOne({ stripeSubscriptionId });
    } catch (error) {
      logger.error(
        `Error finding subscription by Stripe subscription ID: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Find subscriptions by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options (pagination, sorting)
   * @returns {Promise<Object>} Subscriptions with pagination info
   */
  async findByUserId(userId, options = {}) {
    try {
      const { limit = 10, page = 1, sort = { createdAt: -1 } } = options;
      const skip = (page - 1) * limit;

      const subscriptions = await Subscription.find({ userId })
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await Subscription.countDocuments({ userId });

      return {
        subscriptions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`Error finding subscriptions by user ID: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Find active subscriptions by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of active subscription records
   */
  async findActiveByUserId(userId) {
    try {
      return await Subscription.find({
        userId,
        status: { $in: ["active", "trialing"] },
      });
    } catch (error) {
      logger.error(`Error finding active subscriptions: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update subscription by ID
   * @param {string} id - Subscription ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated subscription record
   */
  async updateById(id, updateData) {
    try {
      return await Subscription.findByIdAndUpdate(id, updateData, {
        new: true,
      });
    } catch (error) {
      logger.error(`Error updating subscription: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update subscription by Stripe subscription ID
   * @param {string} stripeSubscriptionId - Stripe subscription ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated subscription record
   */
  async updateByStripeSubscriptionId(stripeSubscriptionId, updateData) {
    try {
      return await Subscription.findOneAndUpdate(
        { stripeSubscriptionId },
        updateData,
        { new: true }
      );
    } catch (error) {
      logger.error(
        `Error updating subscription by Stripe subscription ID: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Cancel subscription by Stripe subscription ID
   * @param {string} stripeSubscriptionId - Stripe subscription ID
   * @param {Date} canceledAt - Cancellation timestamp
   * @returns {Promise<Object>} Updated subscription record
   */
  async cancelSubscription(stripeSubscriptionId, canceledAt = new Date()) {
    try {
      return await Subscription.findOneAndUpdate(
        { stripeSubscriptionId },
        {
          status: "canceled",
          canceledAt,
          cancelAtPeriodEnd: true,
        },
        { new: true }
      );
    } catch (error) {
      logger.error(`Error canceling subscription: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get subscription statistics by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Subscription statistics
   */
  async getStatsByUserId(userId) {
    try {
      const stats = await Subscription.aggregate([
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
        active: 0,
        trialing: 0,
        canceled: 0,
        pastDue: 0,
        unpaid: 0,
        totalAmount: 0,
        activeAmount: 0,
      };

      stats.forEach((stat) => {
        result.total += stat.count;
        result.totalAmount += stat.total;

        if (stat._id === "active") {
          result.active = stat.count;
          result.activeAmount += stat.total;
        } else if (stat._id === "trialing") {
          result.trialing = stat.count;
          result.activeAmount += stat.total;
        } else if (stat._id === "canceled") {
          result.canceled = stat.count;
        } else if (stat._id === "past_due") {
          result.pastDue = stat.count;
        } else if (stat._id === "unpaid") {
          result.unpaid = stat.count;
        }
      });

      return result;
    } catch (error) {
      logger.error(`Error getting subscription stats: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }
}

module.exports = new SubscriptionRepository();
