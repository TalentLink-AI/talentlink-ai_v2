// backend/user-service/src/models/user.model.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    auth0Id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    profile: {
      name: String,
      picture: String,
      // Add additional profile fields needed for onboarding
      title: String,
      bio: String,
      location: String,
      skills: [String],
      phoneNumber: String,
      website: String,
      linkedin: String,
      github: String,
    },
    metadata: {
      lastLogin: { type: Date, default: Date.now },
      onboardingCompleted: { type: Boolean, default: false },
      onboardingStep: {
        type: String,
        enum: ["initial", "basic-info", "skills", "preferences", "completed"],
        default: "initial",
      },
    },
    roles: [String],
    projects: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
