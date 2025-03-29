const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Get current user
router.get("/me", async (req, res) => {
  try {
    // Get the user ID from the Auth0 token
    const auth0Id = req.auth.sub;

    // Find the user in our database
    const user = await User.findOne({ auth0Id });

    // If user doesn't exist in our database, create a new record
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    res.json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({ message: "Error fetching user", error: error.message });
  }
});

// Create/update user profile
router.post("/profile", async (req, res) => {
  try {
    const auth0Id = req.auth.sub;
    const { firstName, lastName, role, profilePicture } = req.body;

    // Find the user or create if doesn't exist
    let user = await User.findOne({ auth0Id });

    if (!user) {
      // Get user email from auth0 token
      const email =
        req.auth[`${process.env.AUTH0_AUDIENCE}/email`] ||
        req.auth.email ||
        req.auth[`https://example.com/email`];

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Create new user
      user = new User({
        auth0Id,
        email,
        role: role || "client", // Default role
      });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (role) user.role = role;
    if (profilePicture) user.profilePicture = profilePicture;

    // Check if profile is complete
    const hasBasicInfo = user.firstName && user.lastName && user.role;
    user.profileComplete = !!hasBasicInfo;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res
      .status(500)
      .json({ message: "Error updating profile", error: error.message });
  }
});

// Get user by ID (admin only)
router.get("/:id", async (req, res) => {
  try {
    const auth0Id = req.auth.sub;

    // Check if requester is admin
    const requester = await User.findOne({ auth0Id });
    if (!requester || requester.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({ message: "Error fetching user", error: error.message });
  }
});

// Get all users (admin only)
router.get("/", async (req, res) => {
  try {
    const auth0Id = req.auth.sub;

    // Check if requester is admin
    const requester = await User.findOne({ auth0Id });
    if (!requester || requester.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
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
    res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
});

module.exports = router;
