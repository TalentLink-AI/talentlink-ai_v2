const User = require("../models/User");

// Handle Auth0 user events
exports.handleAuth0Webhook = async (req, res) => {
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
    res.status(500).json({ message: "Error processing webhook" });
  }
};

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
