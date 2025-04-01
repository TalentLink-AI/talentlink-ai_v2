// backend/user-service/src/models/talent-profile.model.js
const mongoose = require("mongoose");

const talentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    bio: {
      type: String,
      required: true,
    },
    skills: [String],
    hourlyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    availability: {
      type: String,
      enum: ["full-time", "part-time", "contract", "freelance"],
      default: "freelance",
    },
    location: {
      country: String,
      city: String,
      remote: { type: Boolean, default: true },
    },
    education: [
      {
        institution: String,
        degree: String,
        fieldOfStudy: String,
        startDate: Date,
        endDate: Date,
        current: { type: Boolean, default: false },
      },
    ],
    experience: [
      {
        title: String,
        company: String,
        location: String,
        startDate: Date,
        endDate: Date,
        current: { type: Boolean, default: false },
        description: String,
      },
    ],
    languages: [
      {
        language: String,
        proficiency: {
          type: String,
          enum: ["basic", "conversational", "fluent", "native"],
          default: "fluent",
        },
      },
    ],
    portfolio: [
      {
        title: String,
        description: String,
        url: String,
        imageUrl: String,
        technologies: [String],
      },
    ],
    // Social profiles
    website: String,
    linkedin: String,
    github: String,
    // Rating metrics
    avgRating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    completedJobs: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TalentProfile", talentProfileSchema);
