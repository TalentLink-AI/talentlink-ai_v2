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
    role: {
      type: String,
      enum: ["client", "talent", "admin"],
      required: true,
      default: "talent", // Default role
    },
    firstName: String,
    lastName: String,
    profilePicture: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      lastLogin: { type: Date, default: Date.now },
      onboardingCompleted: { type: Boolean, default: false },
      onboardingStep: {
        type: String,
        enum: [
          "initial",
          "basic-info",
          "profile-type",
          "profile-details",
          "completed",
        ],
        default: "initial",
      },
    },
    stripeCustomerId: String,
    stripeConnectedAccountId: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
