// backend/job-service/src/models/job.model.js
const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["draft", "published", "assigned", "completed", "cancelled"],
      default: "published",
    },
    clientId: {
      type: String,
      required: true,
      index: true,
    },
    assignedTo: {
      type: String,
      index: true,
    },
    applications: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    timeline: {
      type: String,
      enum: [
        "less_than_1_week",
        "1_to_2_weeks",
        "2_to_4_weeks",
        "1_to_3_months",
        "3_to_6_months",
        "more_than_6_months",
      ],
    },
    location: {
      type: String,
      enum: ["remote", "on_site", "hybrid"],
      default: "remote",
    },
    milestones: {
      type: [
        {
          description: String,
          amount: Number,
          status: {
            type: String,
            enum: ["pending", "escrowed", "released", "cancelled"],
            default: "pending",
          },
          paymentIntentId: String,
          createdAt: { type: Date, default: Date.now },
          completedAt: Date,
        },
      ],
      default: [],
    },
    visibility: {
      type: String,
      enum: ["public", "private", "invite_only"],
      default: "public",
    },
    attachments: {
      type: [
        {
          name: String,
          url: String,
          type: String,
          size: Number,
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    metadata: {
      type: Map,
      of: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
