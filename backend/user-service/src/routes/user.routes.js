// backend/user-service/src/routes/user.routes.js
const express = require("express");
const User = require("../models/user.model");
const router = express.Router();
const axios = require("axios");

// Get the current user profile
router.get("/me", async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;
    const accessToken = req.headers.authorization.split(" ")[1];

    // Fetch from Auth0 UserInfo endpoint
    const { data: userInfo } = await axios.get(
      `https://dev-zxuicoohweme0r55.us.auth0.com/userinfo`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const email = userInfo.email;

    if (!auth0Id || !email) {
      return res
        .status(400)
        .json({ message: "Incomplete user data from token." });
    }

    // Upsert operation: update existing or create new user
    const user = await User.findOneAndUpdate(
      { auth0Id },
      {
        $setOnInsert: { email }, // Only set email when creating
        $set: { "metadata.lastLogin": new Date() }, // Always update last login
      },
      { new: true, upsert: true }
    );

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Error fetching user profile." });
  }
});

// Update user profile
router.put("/me", async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;

    if (!auth0Id) {
      return res
        .status(400)
        .json({ message: "auth0Id missing from authentication payload." });
    }
    const { profile } = req.body;

    const user = await User.findOneAndUpdate(
      { auth0Id },
      {
        $set: { profile },
        $currentDate: { "metadata.lastUpdated": true },
      },
      { new: true, upsert: true }
    );

    res.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error updating user profile" });
  }
});

module.exports = router;
