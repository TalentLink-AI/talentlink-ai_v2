const mongoose = require("mongoose");

const TalentProfileSchema = new mongoose.Schema(
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
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
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
      country: { type: String },
      city: { type: String },
      remote: { type: Boolean, default: true },
    },
    education: [
      {
        institution: { type: String },
        degree: { type: String },
        fieldOfStudy: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
        current: { type: Boolean, default: false },
      },
    ],
    experience: [
      {
        title: { type: String },
        company: { type: String },
        location: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
        current: { type: Boolean, default: false },
        description: { type: String },
      },
    ],
    languages: [
      {
        language: { type: String },
        proficiency: {
          type: String,
          enum: ["basic", "conversational", "fluent", "native"],
          default: "fluent",
        },
      },
    ],
    portfolio: [
      {
        title: { type: String },
        description: { type: String },
        url: { type: String },
        imageUrl: { type: String },
        technologies: [{ type: String }],
      },
    ],
    // Rating and review metrics
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    completedJobs: {
      type: Number,
      default: 0,
    },
    // Visibility settings
    isVisible: {
      type: Boolean,
      default: true,
    },
    // Timestamps for tracking
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster searches
TalentProfileSchema.index({ userId: 1 });
TalentProfileSchema.index({ skills: 1 });
TalentProfileSchema.index({ hourlyRate: 1 });
TalentProfileSchema.index({ avgRating: -1 });
TalentProfileSchema.index({ "location.country": 1 });
TalentProfileSchema.index({ isVisible: 1 });

// Update the updatedAt field on save
TalentProfileSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("TalentProfile", TalentProfileSchema);
