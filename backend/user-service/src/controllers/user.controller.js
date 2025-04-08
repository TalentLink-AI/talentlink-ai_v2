const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/user.model");

exports.createStripeAccountForTalent = async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const user = await User.findOne({ auth0Id: userId });

    if (!user || user.role !== "talent") {
      return res
        .status(400)
        .json({ error: "Only talents can create a Stripe account" });
    }

    if (user.stripeConnectedAccountId) {
      return res.status(200).json({ accountId: user.stripeConnectedAccountId });
    }

    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
    });

    user.stripeConnectedAccountId = account.id;
    await user.save();

    return res.status(200).json({ accountId: account.id });
  } catch (err) {
    console.error("Stripe account creation failed:", err);
    return res.status(500).json({ error: "Could not create Stripe account" });
  }
};

exports.getStripeOnboardingLink = async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const user = await User.findOne({ auth0Id: userId });

    if (!user || !user.stripeConnectedAccountId) {
      return res.status(400).json({ error: "Stripe account not found" });
    }

    const accountLink = await stripe.accountLinks.create({
      account: user.stripeConnectedAccountId,
      refresh_url: "http://localhost:4200/stripe/onboarding/refresh",
      return_url: "http://localhost:4200/stripe/onboarding/complete",
      type: "account_onboarding",
    });

    return res.status(200).json({ url: accountLink.url });
  } catch (err) {
    console.error("Stripe onboarding link error:", err);
    return res.status(500).json({ error: "Could not get onboarding link" });
  }
};
