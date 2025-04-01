// backend/user-service/src/routes/admin.routes.js
const express = require("express");
const User = require("../models/user.model");
const TalentProfile = require("../models/talent-profile.model");
const ClientProfile = require("../models/client-profile.model");
const router = express.Router();
const Joi = require("joi");

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    // Get roles from the Auth0 token
    const roles = req.auth.payload["https://talentlink.com/roles"] || [];

    if (!roles.includes("admin")) {
      return res
        .status(403)
        .json({ message: "Forbidden: Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Admin authorization error:", error);
    res.status(500).json({ message: "Admin authorization error" });
  }
};

// Apply admin check to all routes
router.use(isAdmin);

// Get dashboard statistics
router.get("/dashboard/stats", async (req, res) => {
  try {
    // Calculate statistics
    const totalUsers = await User.countDocuments({ isActive: true });
    const lastMonthUsers = await User.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      },
    });
    const previousMonthUsers = await User.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setMonth(new Date().getMonth() - 2)),
        $lt: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      },
    });

    // Calculate user trend percentage
    const usersTrend =
      previousMonthUsers > 0
        ? ((lastMonthUsers - previousMonthUsers) / previousMonthUsers) * 100
        : 0;

    // Get recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("firstName lastName email role createdAt");

    // Format recent users for the frontend
    const formattedUsers = recentUsers.map((user) => ({
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      joined: user.createdAt,
    }));

    // For this example, we'll just return static data for the other statistics
    // In a real app, you would compute these from your database
    res.json({
      usersCount: totalUsers,
      activeJobsCount: 267,
      revenue: 42780,
      ticketsCount: 15,
      usersTrend: usersTrend.toFixed(1),
      jobsTrend: 5.3,
      revenueTrend: 8.2,
      ticketsTrend: -3.1,
      recentUsers: formattedUsers,
      recentJobs: [
        {
          id: 101,
          title: "Full Stack Developer",
          company: "Tech Solutions",
          status: "Active",
          posted: new Date("2025-03-28"),
        },
        {
          id: 102,
          title: "UX Designer",
          company: "Creative Design Co",
          status: "Active",
          posted: new Date("2025-03-27"),
        },
        {
          id: 103,
          title: "DevOps Engineer",
          company: "Cloud Systems",
          status: "Filled",
          posted: new Date("2025-03-26"),
        },
        {
          id: 104,
          title: "Marketing Specialist",
          company: "Growth Hacking",
          status: "Active",
          posted: new Date("2025-03-25"),
        },
        {
          id: 105,
          title: "Mobile App Developer",
          company: "App Innovations",
          status: "Paused",
          posted: new Date("2025-03-24"),
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Error fetching dashboard statistics" });
  }
});

// Get all users (with pagination)
router.get("/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    // Build search query
    const query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Get users with pagination
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await User.countDocuments(query);

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
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Get user by ID
router.get("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get profile based on role
    let profile = null;
    if (user.role === "talent") {
      profile = await TalentProfile.findOne({ userId });
    } else if (user.role === "client") {
      profile = await ClientProfile.findOne({ userId });
    }

    res.json({ user, profile });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Error fetching user details" });
  }
});

// Update user
router.put("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated directly
    delete updates.auth0Id;
    delete updates.role; // Role should be updated through a dedicated endpoint
    delete updates.stripeCustomerId;
    delete updates.stripeConnectedAccountId;

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error updating user" });
  }
});

// Update user role
router.put("/users/:userId/role", async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    if (!["talent", "client", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Update user role
    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Error updating user role" });
  }
});

// Toggle user status (activate/deactivate)
router.patch("/users/:userId/status", async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }

    // Update user status
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Error toggling user status:", error);
    res.status(500).json({ message: "Error toggling user status" });
  }
});

// Add routes for other admin functions (jobs, payments, reports, etc.)

module.exports = router;
