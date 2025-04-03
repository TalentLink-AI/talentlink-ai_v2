// backend/payment-service/src/models/payment.model.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    talentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFee: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentType: {
      type: String,
      enum: ["milestone", "time", "escrow"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "succeeded", "failed", "canceled"],
      default: "pending",
    },
    paymentIntentId: {
      type: String,
      required: true,
    },
    transferId: {
      type: String,
    },
    milestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Milestone",
    },
    escrowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EscrowAccount",
    },
    hours: {
      type: Number,
      min: 0,
    },
    description: {
      type: String,
    },
    metaData: {
      type: Map,
      of: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
