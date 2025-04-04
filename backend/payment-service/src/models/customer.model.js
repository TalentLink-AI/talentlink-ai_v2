const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema(
  {
    stripePaymentMethodId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["card", "bank_account", "alipay"],
      default: "card",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    card: {
      brand: String,
      last4: String,
      expMonth: Number,
      expYear: Number,
      fingerprint: String,
      country: String,
    },
    bank_account: {
      bank_name: String,
      last4: String,
      country: String,
      currency: String,
    },
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

const customerSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    stripeCustomerId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
    },
    name: String,
    phone: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postal_code: String,
      country: String,
    },
    defaultPaymentMethod: String,
    paymentMethods: [paymentMethodSchema],
    metadata: {
      type: Map,
      of: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
