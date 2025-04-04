const Joi = require("joi");

// Customer validation schema
exports.customerSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().required(),
  address: Joi.object({
    line1: Joi.string(),
    city: Joi.string(),
    country: Joi.string().default("US"),
  }).optional(),
});

// Card payment validation schema
exports.cardPaymentSchema = Joi.object({
  card_number: Joi.string().required(),
  exp_month: Joi.string().required(),
  exp_year: Joi.string().required(),
  cvv: Joi.string().required(),
  email: Joi.string().email().required(),
  name: Joi.string().required(),
  address: Joi.string().optional(),
  payment_amount: Joi.number().positive().required(),
  description: Joi.string().optional(),
});

// Payment intent validation schema
exports.paymentIntentSchema = Joi.object({
  customerId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  setup_future_usage: Joi.string()
    .valid("on_session", "off_session")
    .optional(),
});

// Refund validation schema
exports.refundSchema = Joi.object({
  chargeId: Joi.string().required(),
  amount: Joi.number().positive().required(),
});

// Connected account validation schema
exports.connectedAccountSchema = Joi.object({
  email: Joi.string().email().required(),
  country: Joi.string().default("US"),
});

// Transfer validation schema
exports.transferSchema = Joi.object({
  amount: Joi.number().positive().required(),
  connectedId: Joi.string().required(),
});

// Subscription validation schema
exports.subscriptionSchema = Joi.object({
  customerId: Joi.string().required(),
  priceId: Joi.string().required(),
  payment_method_id: Joi.string().required(),
  start_date: Joi.number().optional(),
  transferId: Joi.string().optional(),
  amount_percent: Joi.number().min(1).max(100).optional(),
});

// Account link validation schema
exports.accountLinkSchema = Joi.object({
  account_id: Joi.string().required(),
  refresh_url: Joi.string().uri().required(),
  return_url: Joi.string().uri().required(),
});

// Product validation schema
exports.productSchema = Joi.object({
  name: Joi.string().required(),
});

// Price validation schema
exports.priceSchema = Joi.object({
  unit_amount: Joi.number().positive().required(),
  job_name: Joi.string().required(),
  interval: Joi.string().valid("day", "week", "month", "year").default("week"),
});

// Setup intent validation schema
exports.setupIntentSchema = Joi.object({
  customerId: Joi.string().required(),
  usage: Joi.string().valid("on_session", "off_session").default("off_session"),
});
