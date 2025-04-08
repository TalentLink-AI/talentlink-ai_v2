const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  depositAmount: {
    type: Number,
    default: function () {
      return Math.round(this.amount * 0.1 * 100) / 100; // 10% of amount by default
    },
  },
  depositPaid: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: [
      "pending",
      "deposit_paid",
      "in_progress",
      "completed",
      "released",
      "cancelled",
      "escrowed",
    ],
    default: "pending",
  },
  talentStatus: {
    type: String,
    enum: ["not_started", "in_progress", "completed"],
    default: "not_started",
  },
  paymentIntentId: String,
  depositPaymentIntentId: String,
  createdAt: { type: Date, default: Date.now },
  startedAt: Date,
  completedAt: Date,
  clientReviewedAt: Date,
  submissionDetails: String, // For talent to submit details about the completed work
  clientFeedback: String, // For client to provide feedback on the work
});

module.exports = {
  Milestone: mongoose.model("Milestone", milestoneSchema),
  milestoneSchema,
};
