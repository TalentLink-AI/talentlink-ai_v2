const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    stripeCustomerId: {
      type: String,
      required: true,
    },
    stripeSubscriptionId: {
      type: String,
      required: true,
      unique: true,
    },
    stripePriceId: {
      type: String,
      required: true,
    },
    stripeProductId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "incomplete",
        "incomplete_expired",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "trialing",
      ],
      default: "incomplete",
    },
    currentPeriodStart: {
      type: Date,
      required: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    canceledAt: Date,
    endedAt: Date,
    trialStart: Date,
    trialEnd: Date,
    productName: String,
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
    interval: {
      type: String,
      enum: ["day", "week", "month", "year"],
      required: true,
    },
    metadata: {
      type: Map,
      of: String,
    },
    invoiceSettings: {
      defaultPaymentMethod: String,
    },
    latestInvoiceId: String,
    latestInvoiceStatus: String,
    latestInvoiceAmount: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
