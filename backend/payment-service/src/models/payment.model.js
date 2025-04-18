const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    payerId: {
      type: String,
      required: true,
      index: true,
      description: "ID of the client who is paying",
    },
    payeeId: {
      type: String,
      required: true,
      index: true,
      description: "ID of the freelancer who will receive payment",
    },
    projectId: {
      type: String,
      index: true,
      description: "Related project ID",
    },
    milestoneId: {
      type: String,
      description: "Specific milestone this payment is for",
    },
    stripeCustomerId: {
      type: String,
      required: false,
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
    status: {
      type: String,
      enum: [
        "pending",
        "succeeded",
        "failed",
        "refunded",
        "partially_refunded",
        "requires_capture",
        "canceled",
      ],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentIntentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    chargeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    invoiceId: {
      type: String,
      index: true,
    },
    orderId: {
      type: String,
      index: true,
    },
    description: String,
    metadata: {
      type: Map,
      of: String,
    },
    refundedAmount: {
      type: Number,
      default: 0,
    },
    refunds: [
      {
        refundId: String,
        amount: Number,
        reason: String,
        status: String,
        createdAt: Date,
      },
    ],
    receiptUrl: String,
    errorMessage: String,
    billingDetails: {
      name: String,
      email: String,
      phone: String,
      address: {
        line1: String,
        line2: String,
        city: String,
        state: String,
        postal_code: String,
        country: String,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
