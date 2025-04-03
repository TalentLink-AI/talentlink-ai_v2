// backend/payment-service/src/services/payment.service.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const logger = require("../../logger");
const mongoose = require("mongoose");
const Payment = require("../models/payment.model");
const Contract = require("../models/contract.model");
const Milestone = require("../models/milestone.model");
const EscrowAccount = require("../models/escrow-account.model");
const Transaction = require("../models/transaction.model");
const User = require("../../user-service/src/models/user.model");

class PaymentService {
  /**
   * Create a payment method for a user
   * @param {string} userId - User ID
   * @param {string} paymentMethodId - Stripe Payment Method ID
   * @returns {Promise<Object>} - The saved payment method
   */
  async createPaymentMethod(userId, paymentMethodId) {
    try {
      // Get payment method details from Stripe
      const paymentMethod = await stripe.paymentMethods.retrieve(
        paymentMethodId
      );

      // Save payment method reference to our database
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Check if the user has a Stripe customer ID already
      if (!user.stripeCustomerId) {
        // Create a new customer in Stripe
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: user._id.toString(),
          },
        });

        // Save the customer ID to the user
        user.stripeCustomerId = customer.id;
        await user.save();
      }

      // Attach the payment method to the customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.stripeCustomerId,
      });

      // Set this payment method as the default
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Format the response
      const formattedPaymentMethod = {
        id: paymentMethod.id,
        type: paymentMethod.type,
      };

      // Add card details if it's a card
      if (paymentMethod.type === "card" && paymentMethod.card) {
        formattedPaymentMethod.card = {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
        };
      }

      return formattedPaymentMethod;
    } catch (error) {
      logger.error(`Error creating payment method: ${error.message}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Get all payment methods for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - The user's payment methods
   */
  async getPaymentMethods(userId) {
    try {
      const user = await User.findById(userId);

      if (!user || !user.stripeCustomerId) {
        return [];
      }

      // Get payment methods from Stripe
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: "card",
      });

      // Format the response
      return paymentMethods.data.map((pm) => ({
        id: pm.id,
        type: pm.type,
        card: pm.card
          ? {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
            }
          : undefined,
      }));
    } catch (error) {
      logger.error(`Error getting payment methods: ${error.message}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Delete a payment method
   * @param {string} userId - User ID
   * @param {string} paymentMethodId - Stripe Payment Method ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async deletePaymentMethod(userId, paymentMethodId) {
    try {
      const user = await User.findById(userId);

      if (!user || !user.stripeCustomerId) {
        throw new Error("User not found or no customer ID");
      }

      // Check if the payment method belongs to this customer
      const paymentMethod = await stripe.paymentMethods.retrieve(
        paymentMethodId
      );

      if (paymentMethod.customer !== user.stripeCustomerId) {
        throw new Error("Payment method does not belong to this user");
      }

      // Detach the payment method
      await stripe.paymentMethods.detach(paymentMethodId);

      return { success: true };
    } catch (error) {
      logger.error(`Error deleting payment method: ${error.message}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Create an escrow account for a contract
   * @param {string} contractId - Contract ID
   * @param {number} amount - Amount to escrow
   * @returns {Promise<Object>} - The created escrow account
   */
  async createEscrowAccount(contractId, amount) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const contract = await Contract.findById(contractId).session(session);

      if (!contract) {
        throw new Error("Contract not found");
      }

      // Create escrow account in database
      const escrowAccount = new EscrowAccount({
        contractId,
        initialAmount: amount,
        currentBalance: 0, // Start with zero balance until funded
        status: "active",
        transactions: [],
      });

      await escrowAccount.save({ session });

      // Update contract with escrow information
      contract.paymentTerms.escrowId = escrowAccount._id;
      await contract.save({ session });

      await session.commitTransaction();
      session.endSession();

      return {
        id: escrowAccount._id,
        balance: escrowAccount.currentBalance,
        contractId: escrowAccount.contractId,
        status: escrowAccount.status,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      logger.error(`Error creating escrow account: ${error.message}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Fund an escrow account
   * @param {string} escrowId - Escrow account ID
   * @param {string} userId - User ID (client)
   * @param {string} paymentMethodId - Payment method ID
   * @param {number} amount - Amount to fund
   * @returns {Promise<Object>} - The payment intent
   */
  async fundEscrowAccount(escrowId, userId, paymentMethodId, amount) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const escrowAccount = await EscrowAccount.findById(escrowId).session(
        session
      );

      if (!escrowAccount) {
        throw new Error("Escrow account not found");
      }

      if (escrowAccount.status !== "active") {
        throw new Error("Escrow account is not active");
      }

      const contract = await Contract.findById(escrowAccount.contractId)
        .populate("clientId")
        .session(session);

      if (!contract) {
        throw new Error("Contract not found");
      }

      // Verify the user is the client
      if (contract.clientId.toString() !== userId) {
        throw new Error("Only the client can fund the escrow account");
      }

      const user = await User.findById(userId).session(session);

      if (!user || !user.stripeCustomerId) {
        throw new Error("User not found or no customer ID");
      }

      // Calculate platform fee (e.g., 5% of the amount)
      // In a real app, this would be configurable
      const platformFeePercentage = 0.05;
      const platformFee = Math.round(amount * platformFeePercentage);
      const totalAmount = amount + platformFee;

      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount, // Amount in cents
        currency: "usd",
        customer: user.stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true, // Confirm the payment immediately
        off_session: true, // Since we're charging without user interaction
        application_fee_amount: platformFee,
        metadata: {
          escrowId: escrowId.toString(),
          contractId: contract._id.toString(),
          type: "escrow_funding",
        },
      });

      // If payment is successful, update escrow balance
      if (paymentIntent.status === "succeeded") {
        escrowAccount.currentBalance += amount;

        // Record the transaction
        const transaction = new Transaction({
          userId,
          type: "escrow_funding",
          amount,
          platformFee,
          status: "completed",
          contractId: contract._id,
          escrowId,
          paymentIntentId: paymentIntent.id,
          description: `Funded escrow account for contract #${contract._id}`,
        });

        await transaction.save({ session });

        // Add transaction to escrow account
        escrowAccount.transactions.push(transaction._id);
        await escrowAccount.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      return {
        id: paymentIntent.id,
        amount,
        status: paymentIntent.status,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      logger.error(`Error funding escrow account: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Get escrow account balance
   * @param {string} escrowId - Escrow account ID
   * @returns {Promise<number>} - The current balance
   */
  async getEscrowBalance(escrowId) {
    try {
      const escrowAccount = await EscrowAccount.findById(escrowId);

      if (!escrowAccount) {
        throw new Error("Escrow account not found");
      }

      return { balance: escrowAccount.currentBalance };
    } catch (error) {
      logger.error(`Error getting escrow balance: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Release milestone payment from escrow
   * @param {string} contractId - Contract ID
   * @param {string} milestoneId - Milestone ID
   * @param {string} userId - User ID (client)
   * @returns {Promise<Object>} - The updated milestone
   */
  async releaseMilestonePayment(contractId, milestoneId, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const contract = await Contract.findById(contractId)
        .populate("clientId talentId")
        .session(session);

      if (!contract) {
        throw new Error("Contract not found");
      }

      // Verify the user is the client
      if (contract.clientId._id.toString() !== userId) {
        throw new Error("Only the client can release milestone payments");
      }

      const milestone = await Milestone.findOne({
        _id: milestoneId,
        contractId,
      }).session(session);

      if (!milestone) {
        throw new Error("Milestone not found");
      }

      if (milestone.status !== "completed") {
        throw new Error(
          "Milestone must be completed before payment can be released"
        );
      }

      // Get escrow account
      const escrowAccount = await EscrowAccount.findById(
        contract.paymentTerms.escrowId
      ).session(session);

      if (!escrowAccount) {
        throw new Error("Escrow account not found");
      }

      if (escrowAccount.currentBalance < milestone.amount) {
        throw new Error("Insufficient funds in escrow account");
      }

      // Get talent's Stripe account
      const talent = await User.findById(contract.talentId._id).session(
        session
      );

      if (!talent || !talent.stripeConnectedAccountId) {
        throw new Error("Talent does not have a connected Stripe account");
      }

      // Calculate platform fee
      const platformFeePercentage = 0.05;
      const platformFee = Math.round(milestone.amount * platformFeePercentage);
      const talentAmount = milestone.amount - platformFee;

      // Create a transfer to the talent's connected account
      const transfer = await stripe.transfers.create({
        amount: talentAmount,
        currency: "usd",
        destination: talent.stripeConnectedAccountId,
        metadata: {
          contractId: contract._id.toString(),
          milestoneId: milestone._id.toString(),
          type: "milestone_payment",
        },
      });

      // Update milestone status
      milestone.status = "paid";
      milestone.paidDate = new Date();
      milestone.transferId = transfer.id;
      await milestone.save({ session });

      // Update escrow balance
      escrowAccount.currentBalance -= milestone.amount;

      // Record the transaction
      const transaction = new Transaction({
        userId,
        toUserId: contract.talentId._id,
        type: "milestone_payment",
        amount: milestone.amount,
        platformFee,
        talentAmount,
        status: "completed",
        contractId: contract._id,
        escrowId: escrowAccount._id,
        milestoneId: milestone._id,
        transferId: transfer.id,
        description: `Payment for milestone "${milestone.title}" of contract #${contract._id}`,
      });

      await transaction.save({ session });

      // Add transaction to escrow account
      escrowAccount.transactions.push(transaction._id);
      await escrowAccount.save({ session });

      // Check if all milestones are paid
      const unpaidMilestones = await Milestone.countDocuments({
        contractId,
        status: { $ne: "paid" },
      }).session(session);

      if (unpaidMilestones === 0) {
        // All milestones are paid, update contract status
        contract.status = "completed";
        await contract.save({ session });

        // Mark escrow account as completed
        escrowAccount.status = "completed";
        await escrowAccount.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      return {
        id: milestone._id,
        title: milestone.title,
        amount: milestone.amount,
        status: milestone.status,
        paidDate: milestone.paidDate,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      logger.error(`Error releasing milestone payment: ${error.message}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Get milestones for a contract
   * @param {string} contractId - Contract ID
   * @returns {Promise<Array>} - The contract milestones
   */
  async getContractMilestones(contractId) {
    try {
      const milestones = await Milestone.find({ contractId });

      return milestones.map((milestone) => ({
        id: milestone._id,
        title: milestone.title,
        description: milestone.description,
        amount: milestone.amount,
        status: milestone.status,
        dueDate: milestone.dueDate,
        completedDate: milestone.completedDate,
        paidDate: milestone.paidDate,
      }));
    } catch (error) {
      logger.error(`Error getting contract milestones: ${error.message}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Update milestone status
   * @param {string} contractId - Contract ID
   * @param {string} milestoneId - Milestone ID
   * @param {string} status - New status
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - The updated milestone
   */
  async updateMilestoneStatus(contractId, milestoneId, status, userId) {
    try {
      const contract = await Contract.findById(contractId).populate(
        "clientId talentId"
      );

      if (!contract) {
        throw new Error("Contract not found");
      }

      const milestone = await Milestone.findOne({
        _id: milestoneId,
        contractId,
      });

      if (!milestone) {
        throw new Error("Milestone not found");
      }

      // Verify permissions based on the status change
      if (status === "completed") {
        // Only the talent can mark milestone as completed
        if (contract.talentId._id.toString() !== userId) {
          throw new Error("Only the talent can mark a milestone as completed");
        }

        // Check if milestone can be marked as completed
        if (milestone.status !== "inProgress") {
          throw new Error(
            "Milestone must be in progress before it can be completed"
          );
        }

        milestone.status = "completed";
        milestone.completedDate = new Date();
      } else if (status === "inProgress") {
        // Both talent and client can mark milestone as in progress
        if (
          contract.talentId._id.toString() !== userId &&
          contract.clientId._id.toString() !== userId
        ) {
          throw new Error(
            "Only the talent or client can mark a milestone as in progress"
          );
        }

        // Check if milestone can be marked as in progress
        if (milestone.status !== "pending") {
          throw new Error(
            "Milestone must be pending before it can be in progress"
          );
        }

        milestone.status = "inProgress";
        milestone.startDate = new Date();
      } else {
        throw new Error("Invalid status update");
      }

      await milestone.save();

      return {
        id: milestone._id,
        title: milestone.title,
        description: milestone.description,
        amount: milestone.amount,
        status: milestone.status,
        dueDate: milestone.dueDate,
        completedDate: milestone.completedDate,
      };
    } catch (error) {
      logger.error(`Error updating milestone status: ${error.message}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Create payment for time-based (hourly/weekly) contract
   * @param {string} contractId - Contract ID
   * @param {string} clientId - Client user ID
   * @param {string} paymentMethodId - Payment method ID
   * @param {number} hours - Number of hours worked
   * @returns {Promise<Object>} - The payment intent
   */
  async createTimeBasedPayment(contractId, clientId, paymentMethodId, hours) {
    try {
      const contract = await Contract.findById(contractId).populate(
        "clientId talentId"
      );

      if (!contract) {
        throw new Error("Contract not found");
      }

      // Verify the user is the client
      if (contract.clientId._id.toString() !== clientId) {
        throw new Error("Only the client can create time-based payments");
      }

      // Check contract payment model
      if (
        contract.paymentTerms.paymentModel !== "hourly" &&
        contract.paymentTerms.paymentModel !== "weekly"
      ) {
        throw new Error("Contract is not using a time-based payment model");
      }

      const client = await User.findById(clientId);

      if (!client || !client.stripeCustomerId) {
        throw new Error("Client not found or no customer ID");
      }

      // Get talent's Stripe account
      const talent = await User.findById(contract.talentId._id);

      if (!talent || !talent.stripeConnectedAccountId) {
        throw new Error("Talent does not have a connected Stripe account");
      }

      // Calculate amount
      let amount;
      if (contract.paymentTerms.paymentModel === "hourly") {
        amount = Math.round(hours * contract.paymentTerms.hourlyRate * 100); // Convert to cents
      } else {
        // Assuming weekly rate is for 40 hours
        const hourlyRate = contract.paymentTerms.weeklyRate / 40;
        amount = Math.round(hours * hourlyRate * 100); // Convert to cents
      }

      // Calculate platform fee
      const platformFeePercentage = 0.05;
      const platformFee = Math.round(amount * platformFeePercentage);
      const totalAmount = amount + platformFee;

      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: "usd",
        customer: client.stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        application_fee_amount: platformFee,
        transfer_data: {
          destination: talent.stripeConnectedAccountId,
        },
        metadata: {
          contractId: contract._id.toString(),
          type: "time_payment",
          hours: hours.toString(),
        },
      });

      // Record the payment
      const payment = new Payment({
        contractId,
        clientId: client._id,
        talentId: talent._id,
        amount,
        platformFee,
        paymentType: "time",
        hours,
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
      });

      await payment.save();

      // Record the transaction
      const transaction = new Transaction({
        userId: client._id,
        toUserId: talent._id,
        type: "time_payment",
        amount,
        platformFee,
        talentAmount: amount - platformFee,
        status: paymentIntent.status === "succeeded" ? "completed" : "pending",
        contractId: contract._id,
        paymentIntentId: paymentIntent.id,
        description: `Payment for ${hours} hours on contract #${contract._id}`,
      });

      await transaction.save();

      return {
        id: paymentIntent.id,
        amount,
        status: paymentIntent.status,
      };
    } catch (error) {
      logger.error(`Error creating time-based payment: ${error.message}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Create Stripe Connect account link for talent onboarding
   * @param {string} userId - User ID (talent)
   * @returns {Promise<Object>} - The account link URL
   */
  async createConnectAccountLink(userId) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Check if user already has a connected account
      if (!user.stripeConnectedAccountId) {
        // Create a new connected account
        const account = await stripe.accounts.create({
          type: "express",
          country: "US", // Default to US, in a real app this should be configurable
          email: user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: {
            userId: user._id.toString(),
          },
        });

        // Save the account ID to the user
        user.stripeConnectedAccountId = account.id;
        await user.save();
      }

      // Create an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: user.stripeConnectedAccountId,
        refresh_url: `${process.env.FRONTEND_URL}/profile/connect/refresh`,
        return_url: `${process.env.FRONTEND_URL}/profile/connect/complete`,
        type: "account_onboarding",
      });

      return { url: accountLink.url };
    } catch (error) {
      logger.error(`Error creating Connect account link: ${error.message}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Check Connect account onboarding status
   * @param {string} userId - User ID (talent)
   * @returns {Promise<Object>} - Onboarding status
   */
  async checkConnectOnboardingStatus(userId) {
    try {
      const user = await User.findById(userId);

      if (!user || !user.stripeConnectedAccountId) {
        return { completed: false };
      }

      const account = await stripe.accounts.retrieve(
        user.stripeConnectedAccountId
      );

      // Check if the account is fully onboarded (details_submitted && charges_enabled)
      const completed = account.details_submitted && account.charges_enabled;

      return { completed };
    } catch (error) {
      logger.error(
        `Error checking Connect onboarding status: ${error.message}`,
        { error }
      );
      return { completed: false, error: error.message };
    }
  }

  /**
   * Get transaction history
   * @param {string} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Page limit
   * @returns {Promise<Object>} - Transactions with pagination
   */
  async getTransactionHistory(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      // Get transactions where the user is either sender or receiver
      const transactions = await Transaction.find({
        $or: [{ userId }, { toUserId: userId }],
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("contractId", "title")
        .populate("userId", "firstName lastName email")
        .populate("toUserId", "firstName lastName email");

      const total = await Transaction.countDocuments({
        $or: [{ userId }, { toUserId: userId }],
      });

      // Format the transactions
      const formattedTransactions = transactions.map((tx) => ({
        id: tx._id,
        type: tx.type,
        amount: tx.amount,
        fee: tx.platformFee,
        netAmount: tx.talentAmount,
        status: tx.status,
        date: tx.createdAt,
        description: tx.description,
        contract: tx.contractId
          ? {
              id: tx.contractId._id,
              title: tx.contractId.title,
            }
          : null,
        from: tx.userId
          ? {
              id: tx.userId._id,
              name: `${tx.userId.firstName} ${tx.userId.lastName}`,
              email: tx.userId.email,
            }
          : null,
        to: tx.toUserId
          ? {
              id: tx.toUserId._id,
              name: `${tx.toUserId.firstName} ${tx.toUserId.lastName}`,
              email: tx.toUserId.email,
            }
          : null,
      }));

      return {
        transactions: formattedTransactions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`Error getting transaction history: ${error.message}`, {
        error,
      });
      throw error;
    }
  }
}
