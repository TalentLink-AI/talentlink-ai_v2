const express = require("express");
const User = require("../models/user.model");
const TalentProfile = require("../models/talent-profile.model");
const ClientProfile = require("../models/client-profile.model");
const router = express.Router();
const Joi = require("joi");
const logger = require("../../logger");
const axios = require("axios");

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    // Get roles from the Auth0 token payload
    const roles = req.auth.payload["https://talentlink.com/roles"] || [];

    if (!roles.includes("admin")) {
      logger.warn(
        `Forbidden admin access attempt by user: ${req.auth.payload.sub}`
      );
      return res
        .status(403)
        .json({ message: "Forbidden: Admin access required" });
    }

    next();
  } catch (error) {
    logger.error("Admin authorization error", {
      error: error.message,
      stack: error.stack,
    });
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

    logger.info(
      `Dashboard stats fetched by admin user: ${req.auth.payload.sub}`
    );

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
    logger.error("Error fetching dashboard stats", {
      error: error.message,
      stack: error.stack,
    });
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

    logger.info(`Admin ${req.auth.payload.sub} fetched users page ${page}`);

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
    logger.error("Error fetching users", {
      error: error.message,
      stack: error.stack,
    });
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
      logger.warn(
        `User ${userId} not found. Requested by admin ${req.auth.payload.sub}`
      );
      return res.status(404).json({ message: "User not found" });
    }

    // Get profile based on role
    let profile = null;
    if (user.role === "talent") {
      profile = await TalentProfile.findOne({ userId });
    } else if (user.role === "client") {
      profile = await ClientProfile.findOne({ userId });
    }

    logger.info(`Admin ${req.auth.payload.sub} fetched user ${userId}`);

    res.json({ user, profile });
  } catch (error) {
    logger.error("Error fetching user", {
      error: error.message,
      stack: error.stack,
    });
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
      logger.warn(
        `User ${userId} not found during update. Requested by admin ${req.auth.payload.sub}`
      );
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(`User ${userId} updated by admin ${req.auth.payload.sub}`);

    res.json({ user });
  } catch (error) {
    logger.error("Error updating user", {
      error: error.message,
      stack: error.stack,
    });
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
      logger.warn(
        `Invalid role update attempt for user ${userId} by admin ${req.auth.payload.sub}`
      );
      return res.status(400).json({ message: "Invalid role" });
    }

    // Update user role
    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
    if (!user) {
      logger.warn(
        `User ${userId} not found for role update. Requested by admin ${req.auth.payload.sub}`
      );
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(
      `User ${userId} role updated to ${role} by admin ${req.auth.payload.sub}`
    );

    res.json({ user });
  } catch (error) {
    logger.error("Error updating user role", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Error updating user role" });
  }
});

// Toggle user status (activate/deactivate)
router.patch("/users/:userId/status", async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      logger.warn(
        `Invalid isActive value provided by admin ${req.auth.payload.sub} for user ${userId}`
      );
      return res.status(400).json({ message: "isActive must be a boolean" });
    }

    // Update user status
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    );
    if (!user) {
      logger.warn(
        `User ${userId} not found during status toggle by admin ${req.auth.payload.sub}`
      );
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(
      `User ${userId} status toggled to ${isActive} by admin ${req.auth.payload.sub}`
    );

    res.json({ user });
  } catch (error) {
    logger.error("Error toggling user status", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Error toggling user status" });
  }
});

async function getManagementToken() {
  try {
    const { data } = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      {
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
        grant_type: "client_credentials",
      }
    );
    console.log(
      "Management token received:",
      data.access_token.slice(0, 20) + "..."
    );
    return data.access_token;
  } catch (err) {
    console.error(
      "❌ Failed to get Auth0 token:",
      err.response?.data || err.message
    );
    throw err;
  }
}

// Helper function to get role name from ID
async function getRoleName(token, roleId) {
  try {
    const response = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/roles/${roleId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.name;
  } catch (err) {
    logger.error(`Failed to get role name for ${roleId}`, err);
    return null;
  }
}

// Helper to map Auth0 role names to application roles
function mapAuth0RoleToAppRole(roleName) {
  const roleMap = {
    Admin: "admin",
    Client: "client",
    Talent: "talent",
  };

  return roleMap[roleName] || null;
}

router.get("/roles", async (req, res) => {
  try {
    const token = await getManagementToken();
    console.log("Fetching roles with token:", token.slice(0, 20) + "...");

    const { data } = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/roles`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    res.json(data);
  } catch (err) {
    console.error(
      "❌ Failed to fetch roles",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

// Assign Auth0 Role to a user
router.post("/roles/assign", async (req, res) => {
  const { userId, roleId } = req.body;
  if (!userId || !roleId) {
    return res.status(400).json({ error: "userId and roleId required" });
  }

  try {
    const token = await getManagementToken();

    // First, get the role details to know which application role to set
    const roleResponse = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/roles/${roleId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const roleName = roleResponse.data.name.toLowerCase();

    // Map Auth0 role name to application role
    // Make sure this matches your application's expected role values
    const validRoles = ["admin", "client", "talent"];
    const appRole = validRoles.includes(roleName) ? roleName : "talent"; // Default to talent if not found

    logger.info(
      `Mapping Auth0 role ${roleName} to application role ${appRole}`
    );

    // Get user's current roles from Auth0
    const userRolesResponse = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${userId}/roles`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const currentRoles = userRolesResponse.data;

    // Remove all existing roles
    if (currentRoles && currentRoles.length > 0) {
      const currentRoleIds = currentRoles.map((role) => role.id);

      await axios.delete(
        `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${userId}/roles`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { roles: currentRoleIds },
        }
      );

      logger.info(`Removed previous roles from user ${userId}`);
    }

    // Assign the new role in Auth0
    await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${userId}/roles`,
      { roles: [roleId] },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    logger.info(`Assigned role ${roleId} to user ${userId} in Auth0`);

    // Update the user's role in MongoDB
    const user = await User.findOne({ auth0Id: userId });

    if (user) {
      // Update the role in MongoDB
      user.role = appRole;
      await user.save();
      logger.info(
        `Updated user ${userId} MongoDB record with role: ${appRole}`
      );
    } else {
      logger.warn(`User ${userId} not found in MongoDB when updating role`);
    }

    res.json({
      success: true,
      message: "Role assigned successfully and synced with database",
      user: user
        ? {
            id: user._id,
            auth0Id: user.auth0Id,
            role: user.role,
          }
        : null,
    });
  } catch (err) {
    logger.error("Failed to assign role", {
      error: err.message,
      stack: err.stack,
      response: err.response?.data,
    });
    res.status(500).json({ error: "Failed to assign role: " + err.message });
  }
});

router.post("/sync-roles", async (req, res) => {
  try {
    // Verify admin
    const roles = req.auth.payload["https://talentlink.com/roles"] || [];
    if (!roles.includes("admin")) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const token = await getManagementToken();

    // Get all users from Auth0
    const auth0Users = await getAllAuth0Users(token);
    logger.info(`Retrieved ${auth0Users.length} users from Auth0`);

    // Process each user
    const results = {
      total: auth0Users.length,
      updated: 0,
      failed: 0,
      details: [],
    };

    for (const auth0User of auth0Users) {
      try {
        // Get user's roles from Auth0
        const userRolesResponse = await axios.get(
          `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${auth0User.user_id}/roles`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const userRoles = userRolesResponse.data;

        // Extract role name - take the first role or default to 'talent'
        let appRole = "talent"; // Default role
        if (userRoles && userRoles.length > 0) {
          const roleName = userRoles[0].name.toLowerCase();
          if (["admin", "client", "talent"].includes(roleName)) {
            appRole = roleName;
          }
        }

        // Update user in MongoDB
        const user = await User.findOne({ auth0Id: auth0User.user_id });

        if (user) {
          // Only update if the role is different
          if (user.role !== appRole) {
            const oldRole = user.role;
            user.role = appRole;
            await user.save();

            results.updated++;
            results.details.push({
              userId: auth0User.user_id,
              email: auth0User.email,
              oldRole,
              newRole: appRole,
              status: "updated",
            });

            logger.info(
              `Updated user ${auth0User.user_id} role from ${oldRole} to ${appRole}`
            );
          }
        } else {
          results.failed++;
          results.details.push({
            userId: auth0User.user_id,
            email: auth0User.email,
            status: "failed",
            reason: "User not found in MongoDB",
          });

          logger.warn(`User ${auth0User.user_id} not found in MongoDB`);
        }
      } catch (userError) {
        results.failed++;
        results.details.push({
          userId: auth0User.user_id,
          email: auth0User.email,
          status: "failed",
          reason: userError.message,
        });

        logger.error(`Error processing user ${auth0User.user_id}`, {
          error: userError.message,
          stack: userError.stack,
        });
      }
    }

    res.json({
      success: true,
      message: `Synced roles for ${results.updated} users. ${results.failed} failed.`,
      results,
    });
  } catch (err) {
    logger.error("Role sync failed", {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: "Failed to sync roles: " + err.message });
  }
});

// Helper function to get all users from Auth0 (with pagination)
async function getAllAuth0Users(token) {
  const pageSize = 100; // Max page size for Auth0 Management API
  let page = 0;
  let allUsers = [];
  let hasMore = true;

  while (hasMore) {
    const response = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          per_page: pageSize,
          page,
          include_totals: true,
        },
      }
    );

    const users = response.data.users;
    allUsers = [...allUsers, ...users];

    // Check if there are more pages
    const total = response.data.total;
    hasMore = allUsers.length < total;
    page++;
  }

  return allUsers;
}

module.exports = router;
