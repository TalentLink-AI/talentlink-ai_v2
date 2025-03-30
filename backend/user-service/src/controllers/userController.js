const User = require("../models/User");
const TalentProfile = require("../models/TalentProfile");
const ClientProfile = require("../models/ClientProfile");

// Get current user profile
exports.getCurrentUser = async (req, res) => {
  try {
    const auth0Id = req.auth.sub;

    // Find the user
    const user = await User.findOne({ auth0Id });

    if (!user) {
      return res.status(404).json({
        error: true,
        message: "User not found",
      });
    }

    // Get profile based on user role
    let profile = null;
    if (user.role === "talent") {
      profile = await TalentProfile.findOne({ userId: user._id });
    } else if (user.role === "client") {
      profile = await ClientProfile.findOne({ userId: user._id });
    }

    res.json({
      success: true,
      user,
      profile,
      profileComplete: user.profileComplete,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      error: true,
      message: "Error fetching user profile",
    });
  }
};

// Create or update user after Auth0 login
exports.upsertUser = async (req, res) => {
  try {
    const auth0Id = req.auth.sub;
    const email =
      req.auth[`${process.env.AUTH0_AUDIENCE}/email`] || req.auth.email;
    const { firstName, lastName, role, profilePicture } = req.body;

    // Find or create the user
    let user = await User.findOne({ auth0Id });

    if (!user) {
      // Create new user if not found
      user = new User({
        auth0Id,
        email,
        role: role || "client", // Default role
        firstName: firstName || "",
        lastName: lastName || "",
        profilePicture: profilePicture || "",
      });
    } else {
      // Update existing user
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (role) user.role = role;
      if (profilePicture) user.profilePicture = profilePicture;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: "User profile updated",
      user,
    });
  } catch (error) {
    console.error("Error upserting user:", error);
    res.status(500).json({
      error: true,
      message: "Error updating user profile",
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const auth0Id = req.auth.sub;
    const { firstName, lastName, profilePicture } = req.body;

    // Find the user
    const user = await User.findOne({ auth0Id });

    if (!user) {
      return res.status(404).json({
        error: true,
        message: "User not found",
      });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (profilePicture) user.profilePicture = profilePicture;

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      error: true,
      message: "Error updating profile",
    });
  }
};

// Admin-only: Get all users
exports.getAllUsers = async (req, res) => {
  try {
    // Check if user is admin
    const auth0Id = req.auth.sub;
    const user = await User.findOne({ auth0Id });

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        error: true,
        message: "Unauthorized",
      });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filters
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined)
      filter.isActive = req.query.isActive === "true";

    const users = await User.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      error: true,
      message: "Error fetching users",
    });
  }
};
