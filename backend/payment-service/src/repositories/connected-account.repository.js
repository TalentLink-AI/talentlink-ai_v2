const ConnectedAccount = require("../models/connected-account.model");
const logger = require("../utils/logger");

/**
 * Repository class for connected account operations
 */
class ConnectedAccountRepository {
  /**
   * Create a new connected account record
   * @param {Object} accountData - Connected account data
   * @returns {Promise<Object>} Created connected account record
   */
  async create(accountData) {
    try {
      const account = new ConnectedAccount(accountData);
      return await account.save();
    } catch (error) {
      logger.error(
        `Error creating connected account record: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Find connected account by ID
   * @param {string} id - Connected account ID
   * @returns {Promise<Object>} Connected account record
   */
  async findById(id) {
    try {
      return await ConnectedAccount.findById(id);
    } catch (error) {
      logger.error(`Error finding connected account by ID: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Find connected account by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Connected account record
   */
  async findByUserId(userId) {
    try {
      return await ConnectedAccount.findOne({ userId });
    } catch (error) {
      logger.error(
        `Error finding connected account by user ID: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Find connected account by Stripe account ID
   * @param {string} stripeAccountId - Stripe account ID
   * @returns {Promise<Object>} Connected account record
   */
  async findByStripeAccountId(stripeAccountId) {
    try {
      return await ConnectedAccount.findOne({ stripeAccountId });
    } catch (error) {
      logger.error(
        `Error finding connected account by Stripe account ID: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Find all connected accounts
   * @param {Object} options - Query options (pagination, sorting)
   * @returns {Promise<Object>} Connected accounts with pagination info
   */
  async findAll(options = {}) {
    try {
      const { limit = 10, page = 1, sort = { createdAt: -1 } } = options;
      const skip = (page - 1) * limit;

      const accounts = await ConnectedAccount.find()
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await ConnectedAccount.countDocuments();

      return {
        accounts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`Error finding all connected accounts: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update connected account by ID
   * @param {string} id - Connected account ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated connected account record
   */
  async updateById(id, updateData) {
    try {
      return await ConnectedAccount.findByIdAndUpdate(id, updateData, {
        new: true,
      });
    } catch (error) {
      logger.error(`Error updating connected account: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update connected account by user ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated connected account record
   */
  async updateByUserId(userId, updateData) {
    try {
      return await ConnectedAccount.findOneAndUpdate({ userId }, updateData, {
        new: true,
      });
    } catch (error) {
      logger.error(
        `Error updating connected account by user ID: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Update connected account by Stripe account ID
   * @param {string} stripeAccountId - Stripe account ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated connected account record
   */
  async updateByStripeAccountId(stripeAccountId, updateData) {
    try {
      return await ConnectedAccount.findOneAndUpdate(
        { stripeAccountId },
        updateData,
        { new: true }
      );
    } catch (error) {
      logger.error(
        `Error updating connected account by Stripe account ID: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Mark connected account as setup complete
   * @param {string} stripeAccountId - Stripe account ID
   * @returns {Promise<Object>} Updated connected account record
   */
  async markSetupComplete(stripeAccountId) {
    try {
      return await ConnectedAccount.findOneAndUpdate(
        { stripeAccountId },
        { isSetupComplete: true },
        { new: true }
      );
    } catch (error) {
      logger.error(
        `Error marking connected account as setup complete: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Update connected account capabilities
   * @param {string} stripeAccountId - Stripe account ID
   * @param {Object} capabilities - Capabilities object
   * @returns {Promise<Object>} Updated connected account record
   */
  async updateCapabilities(stripeAccountId, capabilities) {
    try {
      return await ConnectedAccount.findOneAndUpdate(
        { stripeAccountId },
        { capabilities },
        { new: true }
      );
    } catch (error) {
      logger.error(
        `Error updating connected account capabilities: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Update connected account requirements
   * @param {string} stripeAccountId - Stripe account ID
   * @param {Object} requirements - Requirements object
   * @returns {Promise<Object>} Updated connected account record
   */
  async updateRequirements(stripeAccountId, requirements) {
    try {
      return await ConnectedAccount.findOneAndUpdate(
        { stripeAccountId },
        { requirements },
        { new: true }
      );
    } catch (error) {
      logger.error(
        `Error updating connected account requirements: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Deactivate connected account
   * @param {string} stripeAccountId - Stripe account ID
   * @returns {Promise<Object>} Updated connected account record
   */
  async deactivate(stripeAccountId) {
    try {
      return await ConnectedAccount.findOneAndUpdate(
        { stripeAccountId },
        { isActive: false },
        { new: true }
      );
    } catch (error) {
      logger.error(`Error deactivating connected account: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update transfer metrics
   * @param {string} stripeAccountId - Stripe account ID
   * @param {number} amount - Transfer amount
   * @returns {Promise<Object>} Updated connected account record
   */
  async updateTransferMetrics(stripeAccountId, amount) {
    try {
      return await ConnectedAccount.findOneAndUpdate(
        { stripeAccountId },
        { $inc: { totalTransfersAmount: amount } },
        { new: true }
      );
    } catch (error) {
      logger.error(`Error updating transfer metrics: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update payout metrics
   * @param {string} stripeAccountId - Stripe account ID
   * @param {number} amount - Payout amount
   * @returns {Promise<Object>} Updated connected account record
   */
  async updatePayoutMetrics(stripeAccountId, amount) {
    try {
      return await ConnectedAccount.findOneAndUpdate(
        { stripeAccountId },
        { $inc: { totalPayoutsAmount: amount } },
        { new: true }
      );
    } catch (error) {
      logger.error(`Error updating payout metrics: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update processed amount metrics
   * @param {string} stripeAccountId - Stripe account ID
   * @param {number} amount - Processed amount
   * @returns {Promise<Object>} Updated connected account record
   */
  async updateProcessedAmountMetrics(stripeAccountId, amount) {
    try {
      return await ConnectedAccount.findOneAndUpdate(
        { stripeAccountId },
        { $inc: { totalProcessedAmount: amount } },
        { new: true }
      );
    } catch (error) {
      logger.error(
        `Error updating processed amount metrics: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Update last webhook event timestamp
   * @param {string} stripeAccountId - Stripe account ID
   * @returns {Promise<Object>} Updated connected account record
   */
  async updateLastWebhookEvent(stripeAccountId) {
    try {
      return await ConnectedAccount.findOneAndUpdate(
        { stripeAccountId },
        { lastWebhookEvent: new Date() },
        { new: true }
      );
    } catch (error) {
      logger.error(`Error updating last webhook event: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }
}

module.exports = new ConnectedAccountRepository();
