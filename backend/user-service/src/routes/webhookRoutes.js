const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Auth0 webhook for user events
router.post("/auth0", async (req, res) => {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.AUTH0_WEBHOOK_SECRET;
    if (webhookSecret && req.headers["x-auth0-signature"] !== webhookSecret) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { event, user } = req.body;

    if (!event || !user) {
      return res.status(400).json({ message: "Invalid webhook payload" });
    }

    // Handle different event types
    switch (event.type) {
      case "user.created":
        await handleUserCreated(user);
        break;

      case "user.updated":
        await handleUserUpdated(user);
        break;

      case "user.deleted":
        await handleUserDeleted(user);
        break;

      default:
        console.log(`Unhandled Auth0 event: ${event.type}`);
    }

    res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Error handling Auth0 webhook:", error);
    res
      .status(500)
      .json({ message: "Error processing webhook", error: error.message });
  }
});

// Stripe webhook for payment events
router.post("/stripe", async (req, res) => {
  try {
    // Verify Stripe webhook signature (in production)
    // Here you would normally validate the Stripe signature

    const event = req.body;

    // Handle different event types
    switch (event.type) {
      case "customer.created":
        await handleStripeCustomerCreated(event.data.object);
        break;

      case "customer.updated":
        await handleStripeCustomerUpdated(event.data.object);
        break;

      case "customer.deleted":
        await handleStripeCustomerDeleted(event.data.object);
        break;

      case "account.updated":
        await handleStripeAccountUpdated(event.data.object);
        break;

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error handling Stripe webhook:", error);
    res
      .status(500)
      .json({ message: "Error processing webhook", error: error.message });
  }
});

// Helper functions for Auth0 events
async function handleUserCreated(userData) {
  try {
    const auth0Id = userData.user_id;

    // Check if user already exists
    const existingUser = await User.findOne({ auth0Id });
    if (existingUser) {
      console.log(`User with Auth0 ID ${auth0Id} already exists`);
      return;
    }

    // Extract user data
    const email = userData.email;
    let role = "client"; // Default role

    // Check if role is in user metadata
    if (userData.user_metadata && userData.user_metadata.role) {
      role = userData.user_metadata.role;
    }

    // Create new user
    const user = new User({
      auth0Id,
      email,
      role,
      firstName: userData.given_name || "",
      lastName: userData.family_name || "",
      profilePicture: userData.picture || "",
    });

    await user.save();
    console.log(`User created: ${auth0Id}`);
  } catch (error) {
    console.error("Error handling user creation:", error);
    throw error;
  }
}

async function handleUserUpdated(userData) {
  try {
    const auth0Id = userData.user_id;

    // Find user
    const user = await User.findOne({ auth0Id });
    if (!user) {
      console.log(`User with Auth0 ID ${auth0Id} not found`);
      return;
    }

    // Update user data
    user.email = userData.email || user.email;
    user.firstName = userData.given_name || user.firstName;
    user.lastName = userData.family_name || user.lastName;
    user.profilePicture = userData.picture || user.profilePicture;

    // Check if role is updated in user metadata
    if (userData.user_metadata && userData.user_metadata.role) {
      user.role = userData.user_metadata.role;
    }

    await user.save();
    console.log(`User updated: ${auth0Id}`);
  } catch (error) {
    console.error("Error handling user update:", error);
    throw error;
  }
}

async function handleUserDeleted(userData) {
  try {
    const auth0Id = userData.user_id;

    // Find and delete user
    const result = await User.deleteOne({ auth0Id });

    if (result.deletedCount > 0) {
      console.log(`User deleted: ${auth0Id}`);
    } else {
      console.log(`User with Auth0 ID ${auth0Id} not found`);
    }
  } catch (error) {
    console.error("Error handling user deletion:", error);
    throw error;
  }
}

// Helper functions for Stripe events
async function handleStripeCustomerCreated(customer) {
  try {
    // Extract customer email and metadata
    const email = customer.email;
    const auth0Id = customer.metadata?.auth0Id;

    if (!auth0Id && !email) {
      console.log("Stripe customer without identifiable information");
      return;
    }

    // Find user by Auth0 ID or email
    let query = {};
    if (auth0Id) {
      query.auth0Id = auth0Id;
    } else {
      query.email = email;
    }

    const user = await User.findOne(query);
    if (!user) {
      console.log(`User not found for Stripe customer: ${customer.id}`);
      return;
    }

    // Update user with Stripe customer ID
    user.stripeCustomerId = customer.id;
    await user.save();

    console.log(`User updated with Stripe customer ID: ${user.auth0Id}`);
  } catch (error) {
    console.error("Error handling Stripe customer creation:", error);
    throw error;
  }
}

async function handleStripeCustomerUpdated(customer) {
  // Similar to customer created event
  await handleStripeCustomerCreated(customer);
}

async function handleStripeCustomerDeleted(customer) {
  try {
    const customerId = customer.id;

    // Find user with this customer ID
    const user = await User.findOne({ stripeCustomerId: customerId });
    if (!user) {
      console.log(`User not found for Stripe customer: ${customerId}`);
      return;
    }

    // Remove Stripe customer ID
    user.stripeCustomerId = null;
    await user.save();

    console.log(`Stripe customer ID removed from user: ${user.auth0Id}`);
  } catch (error) {
    console.error("Error handling Stripe customer deletion:", error);
    throw error;
  }
}

async function handleStripeAccountUpdated(account) {
  try {
    const accountId = account.id;

    // Find user with this connected account ID
    const user = await User.findOne({ stripeConnectedAccountId: accountId });
    if (!user) {
      console.log(`User not found for Stripe connected account: ${accountId}`);
      return;
    }

    // Update account details in metadata if needed
    // For example, track verification status or capabilities
    user.metadata = user.metadata || {};
    user.metadata.stripeAccountStatus = account.charges_enabled
      ? "active"
      : "pending";

    await user.save();

    console.log(`Stripe connected account updated for user: ${user.auth0Id}`);
  } catch (error) {
    console.error("Error handling Stripe account update:", error);
    throw error;
  }
}

module.exports = router;
