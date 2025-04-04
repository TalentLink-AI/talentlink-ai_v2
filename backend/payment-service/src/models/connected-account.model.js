const mongoose = require("mongoose");

const connectedAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    stripeAccountId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
      default: "US",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSetupComplete: {
      type: Boolean,
      default: false,
    },
    charges_enabled: {
      type: Boolean,
      default: false,
    },
    payouts_enabled: {
      type: Boolean,
      default: false,
    },
    requirements: {
      currentlyDue: [String],
      eventuallyDue: [String],
      pendingVerification: [String],
      disabled_reason: String,
      current_deadline: Date,
    },
    capabilities: {
      card_payments: {
        type: String,
        enum: ["active", "inactive", "pending"],
        default: "inactive",
      },
      transfers: {
        type: String,
        enum: ["active", "inactive", "pending"],
        default: "inactive",
      },
    },
    defaultCurrency: {
      type: String,
      default: "USD",
    },
    totalTransfersAmount: {
      type: Number,
      default: 0,
    },
    totalPayoutsAmount: {
      type: Number,
      default: 0,
    },
    totalProcessedAmount: {
      type: Number,
      default: 0,
    },
    metaData: {
      type: Map,
      of: String,
    },
    lastWebhookEvent: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ConnectedAccount", connectedAccountSchema);
