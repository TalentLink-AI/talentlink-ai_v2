const mongoose = require("mongoose");

const ClientProfileSchema = new mongoose.Schema(
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
    website: {
      type: String,
      trim: true,
    },
    location: {
      country: { type: String },
      city: { type: String },
      address: { type: String },
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    socialMedia: {
      linkedin: { type: String },
      twitter: { type: String },
      facebook: { type: String },
      instagram: { type: String },
    },
    logo: {
      type: String,
    },
    // Client metrics
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
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    // Preferences
    preferredSkills: [
      {
        type: String,
        trim: true,
      },
    ],
    preferredRates: {
      min: { type: Number, default: 0 },
      max: { type: Number },
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
ClientProfileSchema.index({ userId: 1 });
ClientProfileSchema.index({ industry: 1 });
ClientProfileSchema.index({ "location.country": 1 });
ClientProfileSchema.index({ preferredSkills: 1 });

// Update the updatedAt field on save
ClientProfileSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("ClientProfile", ClientProfileSchema);
