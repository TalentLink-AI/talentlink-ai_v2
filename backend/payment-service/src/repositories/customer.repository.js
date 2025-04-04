const Customer = require("../models/customer.model");
const logger = require("../utils/logger");

/**
 * Repository class for customer operations
 */
class CustomerRepository {
  /**
   * Create a new customer record
   * @param {Object} customerData - Customer data
   * @returns {Promise<Object>} Created customer record
   */
  async create(customerData) {
    try {
      const customer = new Customer(customerData);
      return await customer.save();
    } catch (error) {
      logger.error(`Error creating customer record: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Find customer by ID
   * @param {string} id - Customer ID
   * @returns {Promise<Object>} Customer record
   */
  async findById(id) {
    try {
      return await Customer.findById(id);
    } catch (error) {
      logger.error(`Error finding customer by ID: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Find customer by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Customer record
   */
  async findByUserId(userId) {
    try {
      return await Customer.findOne({ userId });
    } catch (error) {
      logger.error(`Error finding customer by user ID: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Find customer by Stripe customer ID
   * @param {string} stripeCustomerId - Stripe customer ID
   * @returns {Promise<Object>} Customer record
   */
  async findByStripeCustomerId(stripeCustomerId) {
    try {
      return await Customer.findOne({ stripeCustomerId });
    } catch (error) {
      logger.error(
        `Error finding customer by Stripe customer ID: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Update customer by ID
   * @param {string} id - Customer ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated customer record
   */
  async updateById(id, updateData) {
    try {
      return await Customer.findByIdAndUpdate(id, updateData, { new: true });
    } catch (error) {
      logger.error(`Error updating customer: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update customer by user ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated customer record
   */
  async updateByUserId(userId, updateData) {
    try {
      return await Customer.findOneAndUpdate({ userId }, updateData, {
        new: true,
      });
    } catch (error) {
      logger.error(`Error updating customer by user ID: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update customer by Stripe customer ID
   * @param {string} stripeCustomerId - Stripe customer ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated customer record
   */
  async updateByStripeCustomerId(stripeCustomerId, updateData) {
    try {
      return await Customer.findOneAndUpdate({ stripeCustomerId }, updateData, {
        new: true,
      });
    } catch (error) {
      logger.error(
        `Error updating customer by Stripe customer ID: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Add payment method to customer
   * @param {string} userId - User ID
   * @param {Object} paymentMethodData - Payment method data
   * @param {boolean} setAsDefault - Whether to set as default payment method
   * @returns {Promise<Object>} Updated customer record
   */
  async addPaymentMethod(userId, paymentMethodData, setAsDefault = false) {
    try {
      const customer = await Customer.findOne({ userId });

      if (!customer) {
        throw new Error(`Customer with user ID ${userId} not found`);
      }

      // Check if payment method already exists
      const existingPaymentMethod = customer.paymentMethods.find(
        (method) =>
          method.stripePaymentMethodId ===
          paymentMethodData.stripePaymentMethodId
      );

      if (existingPaymentMethod) {
        // Update existing payment method
        Object.assign(existingPaymentMethod, paymentMethodData);
      } else {
        // Add new payment method
        customer.paymentMethods.push(paymentMethodData);
      }

      // Set as default if specified
      if (setAsDefault) {
        // Unset previous default
        customer.paymentMethods.forEach((method) => {
          method.isDefault = false;
        });

        // Set new default
        const method = customer.paymentMethods.find(
          (method) =>
            method.stripePaymentMethodId ===
            paymentMethodData.stripePaymentMethodId
        );

        if (method) {
          method.isDefault = true;
          customer.defaultPaymentMethod =
            paymentMethodData.stripePaymentMethodId;
        }
      }

      return await customer.save();
    } catch (error) {
      logger.error(
        `Error adding payment method to customer: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Remove payment method from customer
   * @param {string} userId - User ID
   * @param {string} paymentMethodId - Payment method ID
   * @returns {Promise<Object>} Updated customer record
   */
  async removePaymentMethod(userId, paymentMethodId) {
    try {
      const customer = await Customer.findOne({ userId });

      if (!customer) {
        throw new Error(`Customer with user ID ${userId} not found`);
      }

      // Check if payment method is default
      const isDefault = customer.defaultPaymentMethod === paymentMethodId;

      // Remove payment method
      customer.paymentMethods = customer.paymentMethods.filter(
        (method) => method.stripePaymentMethodId !== paymentMethodId
      );

      // If removed method was default, set a new default if available
      if (isDefault && customer.paymentMethods.length > 0) {
        customer.defaultPaymentMethod =
          customer.paymentMethods[0].stripePaymentMethodId;
        customer.paymentMethods[0].isDefault = true;
      } else if (isDefault) {
        customer.defaultPaymentMethod = null;
      }

      return await customer.save();
    } catch (error) {
      logger.error(
        `Error removing payment method from customer: ${error.message}`,
        { stack: error.stack }
      );
      throw error;
    }
  }

  /**
   * Set default payment method
   * @param {string} userId - User ID
   * @param {string} paymentMethodId - Payment method ID
   * @returns {Promise<Object>} Updated customer record
   */
  async setDefaultPaymentMethod(userId, paymentMethodId) {
    try {
      const customer = await Customer.findOne({ userId });

      if (!customer) {
        throw new Error(`Customer with user ID ${userId} not found`);
      }

      // Check if payment method exists
      const paymentMethod = customer.paymentMethods.find(
        (method) => method.stripePaymentMethodId === paymentMethodId
      );

      if (!paymentMethod) {
        throw new Error(
          `Payment method ${paymentMethodId} not found for user ${userId}`
        );
      }

      // Unset previous default
      customer.paymentMethods.forEach((method) => {
        method.isDefault = false;
      });

      // Set new default
      paymentMethod.isDefault = true;
      customer.defaultPaymentMethod = paymentMethodId;

      return await customer.save();
    } catch (error) {
      logger.error(`Error setting default payment method: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }
}

module.exports = new CustomerRepository();
