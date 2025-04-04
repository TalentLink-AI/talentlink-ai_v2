/**
 * Stripe configuration
 */
const STRIPE_CONFIG = {
  SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  CURRENCY: process.env.STRIPE_CURRENCY || "USD",
  SUCCESS_URL:
    process.env.STRIPE_SUCCESS_URL || "http://localhost:3000/payment/success",
  CANCEL_URL:
    process.env.STRIPE_CANCEL_URL || "http://localhost:3000/payment/cancel",
  WEBHOOK_SECRET:
    process.env.STRIPE_WEBHOOK_SECRET ||
    "whsec_BnCeoSpgXQIpH6v1aFP5HpeZLMJuDF2q",
};

/**
 * Application configuration
 */
const APP_CONFIG = {
  API_PREFIX: process.env.API_PREFIX || "/api",
  CORS_ORIGINS: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:3000"],
  PLATFORM_FEE_PERCENT: process.env.PLATFORM_FEE_PERCENT
    ? parseFloat(process.env.PLATFORM_FEE_PERCENT)
    : 15,
};

module.exports = {
  STRIPE_CONFIG,
  APP_CONFIG,
};
