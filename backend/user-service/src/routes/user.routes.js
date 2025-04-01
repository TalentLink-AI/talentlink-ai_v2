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
        $setOnInsert: {
          email,
          "metadata.onboardingCompleted": false,
          "metadata.onboardingStep": "initial",
        },
        $set: { "metadata.lastLogin": new Date() },
      },
      { new: true, upsert: true }
    );

    // Check if onboarding is needed and include a flag in the response
    // This helps the frontend determine if it should show onboarding screens
    const needsOnboarding = !user.metadata.onboardingCompleted;

    res.json({
      ...user.toObject(),
      needsOnboarding,
      currentOnboardingStep: user.metadata.onboardingStep,
    });
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

    const { profile, onboardingStep } = req.body;
    const updateData = {};

    // Update profile if provided
    if (profile) {
      updateData["profile"] = profile;
    }

    // Update onboarding step if provided
    if (onboardingStep) {
      updateData["metadata.onboardingStep"] = onboardingStep;

      // If onboarding is completed, set the flag
      if (onboardingStep === "completed") {
        updateData["metadata.onboardingCompleted"] = true;
      }
    }

    // Add timestamp for the update
    updateData["metadata.lastUpdated"] = new Date();

    const user = await User.findOneAndUpdate(
      { auth0Id },
      { $set: updateData },
      { new: true, upsert: true }
    );

    // Check if profile is complete based on required fields
    const isProfileComplete = checkProfileCompleteness(user);

    // If profile is complete but onboarding not marked as completed,
    // update the onboarding status
    if (isProfileComplete && !user.metadata.onboardingCompleted) {
      user.metadata.onboardingCompleted = true;
      user.metadata.onboardingStep = "completed";
      await user.save();
    }

    res.json({
      ...user.toObject(),
      needsOnboarding: !user.metadata.onboardingCompleted,
      currentOnboardingStep: user.metadata.onboardingStep,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error updating user profile" });
  }
});

// Add a route to update just the onboarding step
router.put("/me/onboarding", async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;
    const { step, profileData } = req.body;

    if (!auth0Id) {
      return res.status(400).json({ message: "Authentication error." });
    }

    const updateData = {
      "metadata.onboardingStep": step,
    };

    // If step is "completed", mark onboarding as completed
    if (step === "completed") {
      updateData["metadata.onboardingCompleted"] = true;
    }

    // If profile data is provided, update the relevant fields
    if (profileData) {
      Object.keys(profileData).forEach((key) => {
        updateData[`profile.${key}`] = profileData[key];
      });
    }

    const user = await User.findOneAndUpdate(
      { auth0Id },
      { $set: updateData },
      { new: true }
    );

    res.json({
      ...user.toObject(),
      needsOnboarding: !user.metadata.onboardingCompleted,
      currentOnboardingStep: user.metadata.onboardingStep,
    });
  } catch (error) {
    console.error("Error updating onboarding status:", error);
    res.status(500).json({ message: "Error updating onboarding status" });
  }
});

// Helper function to check if a profile is complete
function checkProfileCompleteness(user) {
  // Define required fields for a complete profile
  const requiredFields = ["name", "title", "location", "skills"];

  // Check if all required fields exist and are not empty
  return requiredFields.every((field) => {
    if (field === "skills") {
      return user.profile.skills && user.profile.skills.length > 0;
    }
    return user.profile[field] && user.profile[field].trim().length > 0;
  });
}

module.exports = router;
