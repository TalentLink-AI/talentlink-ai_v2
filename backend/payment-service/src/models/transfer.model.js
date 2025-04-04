const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    stripeTransferId: {
      type: String,
      required: true,
      unique: true,
    },
    stripeAccountId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
    },
    description: String,
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "canceled"],
      default: "pending",
    },
    sourceType: {
      type: String,
      enum: ["payment", "subscription", "platform", "refund"],
      required: true,
    },
    sourceId: {
      type: String,
      index: true,
    },
    metadata: {
      type: Map,
      of: String,
    },
    platformFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    platformFeePercent: {
      type: Number,
      min: 0,
      default: 0,
    },
    failureReason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transfer", transferSchema);
