// complete-payment-test.js
// Save this file to your payment-service directory
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const axios = require("axios");

// Constants
const API_HOST = process.env.API_HOST || "http://localhost:3002";
const BASE_PATH = process.env.BASE_PATH || "/api/payment";

// Test card data
const TEST_CARD = {
  number: "4242424242424242",
  exp_month: 12,
  exp_year: 2030,
  cvc: "123",
};

async function runCompletePaymentTest() {
  console.log("🧪 Running Complete Payment Flow Test...\n");

  try {
    // Step 1: Create a customer
    console.log("Step 1: Creating a test customer...");
    const customer = await stripe.customers.create({
      email: `test-${Date.now()}@example.com`,
      name: "Test User",
    });
    console.log(`✅ Created test customer with ID: ${customer.id}`);

    // Step 2: Create a payment method with test card
    console.log("\nStep 2: Creating a test payment method...");
    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: TEST_CARD,
      billing_details: {
        name: "Test User",
        email: customer.email,
      },
    });
    console.log(`✅ Created test payment method with ID: ${paymentMethod.id}`);

    // Step 3: Create a payment intent through your API
    console.log("\nStep 3: Creating payment intent via your API...");
    const createPaymentIntentResponse = await axios.post(
      `${API_HOST}${BASE_PATH}/intent`,
      {
        amount: 1000, // $10.00
        currency: "usd",
        customerId: customer.id,
        // Your API might expect different parameters - adjust accordingly
      }
    );

    const { clientSecret } = createPaymentIntentResponse.data;
    const paymentIntentId = clientSecret.split("_secret_")[0];
    console.log(`✅ Created payment intent with ID: ${paymentIntentId}`);

    // Step 4: Attach the payment method to the payment intent
    console.log("\nStep 4: Attaching payment method to payment intent...");
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customer.id,
    });

    // Update the payment intent with the payment method
    const updatedPaymentIntent = await stripe.paymentIntents.update(
      paymentIntentId,
      {
        payment_method: paymentMethod.id,
      }
    );
    console.log(`✅ Attached payment method to payment intent`);

    // Step 5: Confirm the payment intent
    console.log("\nStep 5: Confirming payment intent...");
    const confirmedPaymentIntent = await stripe.paymentIntents.confirm(
      paymentIntentId
    );
    console.log(
      `✅ Payment intent confirmation status: ${confirmedPaymentIntent.status}`
    );

    if (confirmedPaymentIntent.status === "succeeded") {
      console.log("\n🎉 Complete payment flow test SUCCEEDED!");
    } else {
      console.log(
        `\n⚠️ Payment intent is in ${confirmedPaymentIntent.status} state. May require additional actions.`
      );
    }

    // Print webhook events (optional)
    console.log("\nWaiting 5 seconds to check for webhook events...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const events = await stripe.events.list({
      type: "payment_intent.succeeded",
      created: {
        gte: Math.floor(Date.now() / 1000) - 300, // Events from the last 5 minutes
      },
    });

    if (events.data.length > 0) {
      console.log(
        `✅ Found ${events.data.length} recent payment_intent.succeeded events`
      );
      const relevantEvent = events.data.find(
        (e) => e.data.object.id === paymentIntentId
      );
      if (relevantEvent) {
        console.log(`✅ Webhook event for this payment intent was triggered`);
      } else {
        console.log(
          `⚠️ No webhook event for this specific payment intent was found`
        );
      }
    } else {
      console.log(`⚠️ No recent payment_intent.succeeded events found`);
    }

    // Clean up
    console.log("\nCleaning up test data...");
    await stripe.customers.del(customer.id);
    console.log("✅ Test customer deleted");

    return true;
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Response data:", error.response.data);
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Execute
runCompletePaymentTest().catch(console.error);
