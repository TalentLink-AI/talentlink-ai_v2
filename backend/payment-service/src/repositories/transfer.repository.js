const Transfer = require("../models/transfer.model");
const logger = require("../utils/logger");

/**
 * Repository class for transfer operations
 */
class TransferRepository {
  /**
   * Create a new transfer record
   * @param {Object} transferData - Transfer data
   * @returns {Promise<Object>} Created transfer record
   */
  async create(transferData) {
    try {
      const transfer = new Transfer(transferData);
      return await transfer.save();
    } catch (error) {
      logger.error(`Error creating transfer record: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Find transfer by ID
   * @param {string} id - Transfer ID
   * @returns {Promise<Object>} Transfer record
   */
  async findById(id) {
    try {
      return await Transfer.findById(id);
    } catch (error) {
      logger.error(`Error finding transfer by ID: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Find transfer by Stripe transfer ID
   * @param {string} stripeTransferId - Stripe transfer ID
   * @returns {Promise<Object>} Transfer record
   */
  async findByStripeTransferId(stripeTransferId) {
    try {
      return await Transfer.findOne({ stripeTransferId });
    } catch (error) {
      logger.error(
        `Error finding transfer by Stripe transfer ID: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Find transfers by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options (pagination, sorting)
   * @returns {Promise<Object>} Transfers with pagination info
   */
  async findByUserId(userId, options = {}) {
    try {
      const { limit = 10, page = 1, sort = { createdAt: -1 } } = options;
      const skip = (page - 1) * limit;

      const transfers = await Transfer.find({ userId })
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await Transfer.countDocuments({ userId });

      return {
        transfers,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`Error finding transfers by user ID: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Find transfers by connected account ID
   * @param {string} stripeAccountId - Stripe account ID
   * @param {Object} options - Query options (pagination, sorting)
   * @returns {Promise<Object>} Transfers with pagination info
   */
  async findByStripeAccountId(stripeAccountId, options = {}) {
    try {
      const { limit = 10, page = 1, sort = { createdAt: -1 } } = options;
      const skip = (page - 1) * limit;

      const transfers = await Transfer.find({ stripeAccountId })
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await Transfer.countDocuments({ stripeAccountId });

      return {
        transfers,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(
        `Error finding transfers by Stripe account ID: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Update transfer by ID
   * @param {string} id - Transfer ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated transfer record
   */
  async updateById(id, updateData) {
    try {
      return await Transfer.findByIdAndUpdate(id, updateData, { new: true });
    } catch (error) {
      logger.error(`Error updating transfer: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update transfer by Stripe transfer ID
   * @param {string} stripeTransferId - Stripe transfer ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated transfer record
   */
  async updateByStripeTransferId(stripeTransferId, updateData) {
    try {
      return await Transfer.findOneAndUpdate({ stripeTransferId }, updateData, {
        new: true,
      });
    } catch (error) {
      logger.error(
        `Error updating transfer by Stripe transfer ID: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Get transfer statistics by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Transfer statistics
   */
  async getStatsByUserId(userId) {
    try {
      const stats = await Transfer.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            total: { $sum: "$amount" },
          },
        },
      ]);

      // Format the result
      const result = {
        total: 0,
        pending: 0,
        paid: 0,
        failed: 0,
        canceled: 0,
        totalAmount: 0,
        paidAmount: 0,
      };

      stats.forEach((stat) => {
        result.total += stat.count;
        result.totalAmount += stat.total;

        if (stat._id === "pending") {
          result.pending = stat.count;
        } else if (stat._id === "paid") {
          result.paid = stat.count;
          result.paidAmount = stat.total;
        } else if (stat._id === "failed") {
          result.failed = stat.count;
        } else if (stat._id === "canceled") {
          result.canceled = stat.count;
        }
      });

      return result;
    } catch (error) {
      logger.error(`Error getting transfer stats: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get transfer statistics by connected account ID
   * @param {string} stripeAccountId - Stripe account ID
   * @returns {Promise<Object>} Transfer statistics
   */
  async getStatsByStripeAccountId(stripeAccountId) {
    try {
      const stats = await Transfer.aggregate([
        { $match: { stripeAccountId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            total: { $sum: "$amount" },
          },
        },
      ]);

      // Format the result
      const result = {
        total: 0,
        pending: 0,
        paid: 0,
        failed: 0,
        canceled: 0,
        totalAmount: 0,
        paidAmount: 0,
      };

      stats.forEach((stat) => {
        result.total += stat.count;
        result.totalAmount += stat.total;

        if (stat._id === "pending") {
          result.pending = stat.count;
        } else if (stat._id === "paid") {
          result.paid = stat.count;
          result.paidAmount = stat.total;
        } else if (stat._id === "failed") {
          result.failed = stat.count;
        } else if (stat._id === "canceled") {
          result.canceled = stat.count;
        }
      });

      return result;
    } catch (error) {
      logger.error(`Error getting transfer stats: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }
}

module.exports = new TransferRepository();
