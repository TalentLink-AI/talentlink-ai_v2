// backend/job-service/src/models/application.model.js
const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    talentId: {
      type: String,
      required: true,
      index: true,
    },
    coverLetter: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    expectedRate: {
      type: Number,
      min: 0,
    },
    availability: {
      startDate: Date,
      hoursPerWeek: Number,
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
    notes: {
      type: String,
    },
    clientNotes: {
      type: String,
    },
    metadata: {
      type: Map,
      of: String,
    },
  },
  { timestamps: true }
);

// Compound index for unique applications (one per talent per job)
applicationSchema.index({ jobId: 1, talentId: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);
