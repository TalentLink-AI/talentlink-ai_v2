// backend/user-service/src/models/client-profile.model.js
const mongoose = require("mongoose");

const clientProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    industry: {
      type: String,
      required: true,
      trim: true,
    },
    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
      default: "1-10",
    },
    description: {
      type: String,
      required: true,
    },
    website: String,
    location: {
      country: String,
      city: String,
      address: String,
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    contactPhone: String,
    socialMedia: {
      linkedin: String,
      twitter: String,
      facebook: String,
      instagram: String,
    },
    logo: String,
    // Metrics
    jobsPosted: {
      type: Number,
      default: 0,
    },
    talentsHired: {
      type: Number,
      default: 0,
    },
    avgRating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    // Preferences
    preferredSkills: [String],
    preferredRates: {
      min: { type: Number, default: 0 },
      max: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClientProfile", clientProfileSchema);
