// Create new file: src/models/saved-search.model.js
const mongoose = require("mongoose");

const savedSearchSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    filters: {
      search: String,
      category: String,
      skills: [String],
      minBudget: Number,
      maxBudget: Number,
      location: String,
      timeline: String,
    },
    alertEnabled: {
      type: Boolean,
      default: false,
    },
    alertFrequency: {
      type: String,
      enum: ["daily", "weekly", "immediately"],
      default: "daily",
    },
    lastAlertSent: Date,
    lastResults: {
      count: Number,
      lastJobId: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SavedSearch", savedSearchSchema);
