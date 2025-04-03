// backend/payment-service/src/models/milestone.model.js
const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "inProgress", "completed", "paid"],
      default: "pending",
    },
    order: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
    },
    startDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    paidDate: {
      type: Date,
    },
    deliverables: [
      {
        type: String,
      },
    ],
    attachments: [
      {
        filename: String,
        url: String,
        mimeType: String,
        uploadDate: Date,
      },
    ],
    feedback: {
      clientComment: String,
      talentResponse: String,
      revisionRequested: Boolean,
    },
    paymentIntentId: {
      type: String,
    },
    transferId: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index for efficient querying
milestoneSchema.index({ contractId: 1, status: 1 });
milestoneSchema.index({ contractId: 1, order: 1 });

module.exports = mongoose.model("Milestone", milestoneSchema);
