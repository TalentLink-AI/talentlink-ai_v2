const express = require("express");
const router = express.Router();
const User = require("../models/User");
const TalentProfile = require("../models/TalentProfile");
const ClientProfile = require("../models/ClientProfile");

// Get user profile (talent or client)
router.get("/", async (req, res) => {
  try {
    const auth0Id = req.auth.sub;

    // Find the user
    const user = await User.findOne({ auth0Id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let profile;

    // Get the appropriate profile based on user role
    if (user.role === "talent") {
      profile = await TalentProfile.findOne({ userId: user._id });
    } else if (user.role === "client") {
      profile = await ClientProfile.findOne({ userId: user._id });
    } else {
      return res.status(400).json({ message: "Invalid user role" });
    }

    if (!profile) {
      return res.json({
        user,
        profile: null,
        message: "Profile not created yet",
      });
    }

    res.json({
      user,
      profile,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res
      .status(500)
      .json({ message: "Error fetching profile", error: error.message });
  }
});

// Create or update talent profile
router.post("/talent", async (req, res) => {
  try {
    const auth0Id = req.auth.sub;

    // Find the user
    const user = await User.findOne({ auth0Id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is a talent
    if (user.role !== "talent") {
      return res.status(400).json({ message: "User is not a talent" });
    }

    const {
      title,
      bio,
      skills,
      hourlyRate,
      availability,
      location,
      education,
      experience,
      languages,
      portfolio,
    } = req.body;

    // Find existing profile or create new one
    let profile = await TalentProfile.findOne({ userId: user._id });

    if (!profile) {
      profile = new TalentProfile({
        userId: user._id,
        title: title || "",
        bio: bio || "",
        skills: skills || [],
        hourlyRate: hourlyRate || 0,
        availability: availability || "part-time",
        location: location || {},
        education: education || [],
        experience: experience || [],
        languages: languages || [],
        portfolio: portfolio || [],
      });
    } else {
      // Update existing profile
      if (title !== undefined) profile.title = title;
      if (bio !== undefined) profile.bio = bio;
      if (skills !== undefined) profile.skills = skills;
      if (hourlyRate !== undefined) profile.hourlyRate = hourlyRate;
      if (availability !== undefined) profile.availability = availability;
      if (location !== undefined) profile.location = location;
      if (education !== undefined) profile.education = education;
      if (experience !== undefined) profile.experience = experience;
      if (languages !== undefined) profile.languages = languages;
      if (portfolio !== undefined) profile.portfolio = portfolio;
    }

    await profile.save();

    // Update user profile completion status
    const isComplete = !!(
      profile.title &&
      profile.bio &&
      profile.skills.length > 0 &&
      profile.hourlyRate > 0 &&
      profile.availability &&
      profile.location &&
      profile.location.country
    );

    user.profileComplete = isComplete;
    await user.save();

    res.json({
      message: "Talent profile updated successfully",
      profile,
      user,
    });
  } catch (error) {
    console.error("Error updating talent profile:", error);
    res
      .status(500)
      .json({ message: "Error updating talent profile", error: error.message });
  }
});

// Create or update client profile
router.post("/client", async (req, res) => {
  try {
    const auth0Id = req.auth.sub;

    // Find the user
    const user = await User.findOne({ auth0Id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is a client
    if (user.role !== "client") {
      return res.status(400).json({ message: "User is not a client" });
    }

    const {
      companyName,
      industry,
      companySize,
      description,
      website,
      location,
      contactEmail,
      contactPhone,
    } = req.body;

    // Find existing profile or create new one
    let profile = await ClientProfile.findOne({ userId: user._id });

    if (!profile) {
      profile = new ClientProfile({
        userId: user._id,
        companyName: companyName || "",
        industry: industry || "",
        companySize: companySize || "",
        description: description || "",
        website: website || "",
        location: location || {},
        contactEmail: contactEmail || user.email,
        contactPhone: contactPhone || "",
      });
    } else {
      // Update existing profile
      if (companyName !== undefined) profile.companyName = companyName;
      if (industry !== undefined) profile.industry = industry;
      if (companySize !== undefined) profile.companySize = companySize;
      if (description !== undefined) profile.description = description;
      if (website !== undefined) profile.website = website;
      if (location !== undefined) profile.location = location;
      if (contactEmail !== undefined) profile.contactEmail = contactEmail;
      if (contactPhone !== undefined) profile.contactPhone = contactPhone;
    }

    await profile.save();

    // Update user profile completion status
    const isComplete = !!(
      profile.companyName &&
      profile.industry &&
      profile.description &&
      profile.location &&
      profile.location.country
    );

    user.profileComplete = isComplete;
    await user.save();

    res.json({
      message: "Client profile updated successfully",
      profile,
      user,
    });
  } catch (error) {
    console.error("Error updating client profile:", error);
    res
      .status(500)
      .json({ message: "Error updating client profile", error: error.message });
  }
});

module.exports = router;
