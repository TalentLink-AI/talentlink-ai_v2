// backend/user-service/src/routes/user.routes.js
const express = require("express");
const User = require("../models/user.model");
const TalentProfile = require("../models/talent-profile.model");
const ClientProfile = require("../models/client-profile.model");
const router = express.Router();
const axios = require("axios");
const Joi = require("joi");
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth");
const internalAuthMiddleware = require("../middlewares/internal-auth");

// Validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    next();
  };
};

// Get the current user profile
router.get("/me", async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;
    const accessToken = req.headers.authorization.split(" ")[1];

    // Fetch from Auth0 UserInfo endpoint
    const { data: userInfo } = await axios.get(
      `${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`,
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

    // Find or create base user
    let user = await User.findOne({ auth0Id });

    if (!user) {
      // Create new user
      user = new User({
        auth0Id,
        email,
        firstName: userInfo.given_name || "",
        lastName: userInfo.family_name || "",
        profilePicture: userInfo.picture || "",
        role: "talent", // Default role
        metadata: {
          lastLogin: new Date(),
          onboardingCompleted: false,
          onboardingStep: "initial",
        },
      });

      await user.save();
    } else {
      // Update last login
      user.metadata.lastLogin = new Date();
      await user.save();
    }

    // Get the appropriate profile based on role
    let profile = null;
    if (user.role === "talent") {
      profile = await TalentProfile.findOne({ userId: user._id });
    } else if (user.role === "client") {
      profile = await ClientProfile.findOne({ userId: user._id });
    }

    // Check if onboarding is needed
    const needsOnboarding = !user.metadata.onboardingCompleted || !profile;

    res.json({
      user,
      profile,
      needsOnboarding,
      currentOnboardingStep: user.metadata.onboardingStep,
      isAdmin: user.role === "admin",
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Error fetching user profile." });
  }
});

// validate - Get the current user profile
const userProfileUpdateSchema = Joi.object({
  firstName: Joi.string().trim().max(100),
  lastName: Joi.string().trim().max(100),
  role: Joi.string().valid("talent", "client"),
  onboardingStep: Joi.string().valid(
    "initial",
    "basic-info",
    "profile-type",
    "profile-details",
    "completed"
  ),
});

// Update user profile
router.put(
  "/me",
  validateRequest(userProfileUpdateSchema),
  async (req, res) => {
    try {
      const auth0Id = req.auth.payload.sub;

      if (!auth0Id) {
        return res
          .status(400)
          .json({ message: "auth0Id missing from authentication payload." });
      }

      const { firstName, lastName, role, onboardingStep } = req.body;
      const updateData = {};

      // Update basic info if provided
      if (firstName !== undefined) {
        updateData["firstName"] = firstName;
      }

      if (lastName !== undefined) {
        updateData["lastName"] = lastName;
      }

      // Update role if provided
      if (role !== undefined) {
        updateData["role"] = role;
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
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get the appropriate profile based on role
      let profile = null;
      if (user.role === "talent") {
        profile = await TalentProfile.findOne({ userId: user._id });
      } else if (user.role === "client") {
        profile = await ClientProfile.findOne({ userId: user._id });
      }

      // Check if profile is complete based on required fields
      const isProfileComplete = profile
        ? checkProfileCompleteness(profile, user.role)
        : false;

      // If profile is complete but onboarding not marked as completed,
      // update the onboarding status
      if (isProfileComplete && !user.metadata.onboardingCompleted) {
        user.metadata.onboardingCompleted = true;
        user.metadata.onboardingStep = "completed";
        await user.save();
      }

      // Determine if onboarding is needed
      const needsOnboarding = !user.metadata.onboardingCompleted || !profile;

      res.json({
        user,
        profile,
        needsOnboarding,
        currentOnboardingStep: user.metadata.onboardingStep,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Error updating user profile" });
    }
  }
);

// Update user role
const roleUpdateSchema = Joi.object({
  role: Joi.string().valid("talent", "client").required(),
});
// Set user role (talent or client)
router.post("/role", validateRequest(roleUpdateSchema), async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;
    const { role } = req.body;

    if (!["talent", "client"].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    // Update user role
    const user = await User.findOneAndUpdate(
      { auth0Id },
      {
        $set: {
          role,
          "metadata.onboardingStep": "profile-details",
        },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get profile if it exists
    let profile = null;
    if (role === "talent") {
      profile = await TalentProfile.findOne({ userId: user._id });
    } else if (role === "client") {
      profile = await ClientProfile.findOne({ userId: user._id });
    }

    // Determine if onboarding is needed
    const needsOnboarding = !user.metadata.onboardingCompleted || !profile;

    res.json({
      user,
      profile,
      needsOnboarding,
      currentOnboardingStep: user.metadata.onboardingStep,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Error updating user role" });
  }
});

// Update talent profile
router.post("/profile/talent", async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;
    const user = await User.findOne({ auth0Id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "talent") {
      return res.status(400).json({ message: "User is not a talent" });
    }

    // Find or create talent profile
    let profile = await TalentProfile.findOne({ userId: user._id });

    if (!profile) {
      profile = new TalentProfile({
        userId: user._id,
        ...req.body,
      });
    } else {
      // Update existing profile fields
      Object.assign(profile, req.body);
    }

    await profile.save();

    // Check if profile is complete based on required fields
    const isProfileComplete = checkProfileCompleteness(profile, "talent");

    // Mark onboarding as complete if all required fields are present
    if (isProfileComplete) {
      user.metadata.onboardingCompleted = true;
      user.metadata.onboardingStep = "completed";
      await user.save();
    }

    res.json({
      user,
      profile,
      needsOnboarding: !isProfileComplete,
      currentOnboardingStep: user.metadata.onboardingStep,
    });
  } catch (error) {
    console.error("Error updating talent profile:", error);
    res.status(500).json({ message: "Error updating talent profile" });
  }
});

// Update client profile
router.post("/profile/client", async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;
    const user = await User.findOne({ auth0Id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "client") {
      return res.status(400).json({ message: "User is not a client" });
    }

    // Find or create client profile
    let profile = await ClientProfile.findOne({ userId: user._id });

    if (!profile) {
      profile = new ClientProfile({
        userId: user._id,
        ...req.body,
      });
    } else {
      // Update existing profile
      Object.assign(profile, req.body);
    }

    await profile.save();

    // Check if profile is complete based on required fields
    const isProfileComplete = checkProfileCompleteness(profile, "client");

    // Mark onboarding as complete if all required fields are present
    if (isProfileComplete) {
      user.metadata.onboardingCompleted = true;
      user.metadata.onboardingStep = "completed";
      await user.save();
    }

    res.json({
      user,
      profile,
      needsOnboarding: !isProfileComplete,
      currentOnboardingStep: user.metadata.onboardingStep,
    });
  } catch (error) {
    console.error("Error updating client profile:", error);
    res.status(500).json({ message: "Error updating client profile" });
  }
});

// Update just the onboarding step
router.put("/onboarding-step", async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;
    const { step } = req.body;

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

    const user = await User.findOneAndUpdate(
      { auth0Id },
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the appropriate profile
    let profile = null;
    if (user.role === "talent") {
      profile = await TalentProfile.findOne({ userId: user._id });
    } else if (user.role === "client") {
      profile = await ClientProfile.findOne({ userId: user._id });
    }

    res.json({
      user,
      profile,
      needsOnboarding: !user.metadata.onboardingCompleted,
      currentOnboardingStep: user.metadata.onboardingStep,
    });
  } catch (error) {
    console.error("Error updating onboarding status:", error);
    res.status(500).json({ message: "Error updating onboarding status" });
  }
});

// Helper function to check if a profile is complete
function checkProfileCompleteness(profile, role) {
  if (!profile) return false;

  if (role === "talent") {
    // Required fields for talent profile
    return Boolean(
      profile.title &&
        profile.title.trim().length > 0 &&
        profile.bio &&
        profile.bio.trim().length > 0 &&
        profile.skills &&
        profile.skills.length > 0 &&
        profile.location &&
        profile.location.country &&
        profile.location.country.trim().length > 0 &&
        profile.location.city &&
        profile.location.city.trim().length > 0
    );
  } else if (role === "client") {
    // Required fields for client profile
    return Boolean(
      profile.companyName &&
        profile.companyName.trim().length > 0 &&
        profile.industry &&
        profile.industry.trim().length > 0 &&
        profile.description &&
        profile.description.trim().length > 0 &&
        profile.location &&
        profile.location.country &&
        profile.location.country.trim().length > 0 &&
        profile.location.city &&
        profile.location.city.trim().length > 0 &&
        profile.contactEmail &&
        profile.contactEmail.trim().length > 0
    );
  }

  return false;
}

router.post(
  "/stripe/account",
  authMiddleware,
  userController.createStripeAccountForTalent
);
router.get(
  "/stripe/onboarding-link",
  authMiddleware,
  userController.getStripeOnboardingLink
);

router.get(
  "/admin/users/:auth0Id",
  internalAuthMiddleware,
  async (req, res) => {
    try {
      const { auth0Id } = req.params;

      // Find the user by auth0Id
      const user = await User.findOne({ auth0Id });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user data, including Stripe connected account ID
      res.json({
        _id: user._id,
        auth0Id: user.auth0Id,
        email: user.email,
        role: user.role,
        stripeConnectedAccountId: user.stripeConnectedAccountId,
      });
    } catch (error) {
      console.error("Error fetching user by auth0Id:", error);
      res.status(500).json({ message: "Error fetching user" });
    }
  }
);

module.exports = router;
