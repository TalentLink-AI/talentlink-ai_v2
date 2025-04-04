// payment-api-test.js
// Save this file to your payment-service directory
require("dotenv").config();
const axios = require("axios");

// Configure this to match your setup
const API_HOST = process.env.API_HOST || "http://localhost:3002";
const BASE_PATH = process.env.BASE_PATH || "/api/payment";

async function testPaymentAPI() {
  console.log("🧪 Testing Payment Service API Endpoints...\n");

  try {
    // Test 1: Create a customer
    console.log("Test 1: Creating a customer...");
    const customerResponse = await axios.post(
      `${API_HOST}${BASE_PATH}/customers`,
      {
        email: `test-api-${Date.now()}@example.com`,
        name: "Test API User",
      }
    );

    console.log(
      `✅ Customer API call succeeded with status: ${customerResponse.status}`
    );
    const customerId = customerResponse.data.data.stripeCustomer.id;
    console.log(`✅ Created customer ID: ${customerId}`);

    // Test 2: Create a payment intent
    console.log("\nTest 2: Creating a payment intent...");
    const paymentIntentResponse = await axios.post(
      `${API_HOST}${BASE_PATH}/intent`,
      {
        amount: 1500, // $15.00
        currency: "usd",
        customerId: customerId,
      }
    );

    console.log(
      `✅ Payment Intent API call succeeded with status: ${paymentIntentResponse.status}`
    );
    console.log(
      "✅ Client secret received:",
      paymentIntentResponse.data.data.client_secret ? "Yes" : "No"
    );

    // Test 3: Create a card payment method token (simulated)
    console.log(
      "\nTest 3: Creating a card payment method (direct with Stripe)..."
    );
    // Note: In a real frontend, this would be done using Stripe Elements
    // For testing purposes, we're creating it directly with Stripe API
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: {
        number: "4242424242424242",
        exp_month: 12,
        exp_year: 2030,
        cvc: "123",
      },
    });
    console.log(`✅ Created payment method ID: ${paymentMethod.id}`);

    // Test 4: Attach payment method to customer
    console.log("\nTest 4: Attaching payment method to customer...");
    const attachResponse = await axios.post(
      `${API_HOST}${BASE_PATH}/payment-methods/attach`,
      {
        paymentMethodId: paymentMethod.id,
        customerId: customerId,
      }
    );

    console.log(
      `✅ Attach payment method API call succeeded with status: ${attachResponse.status}`
    );

    // Test 5: Set default payment method
    console.log("\nTest 5: Setting default payment method...");
    const defaultResponse = await axios.post(
      `${API_HOST}${BASE_PATH}/payment-methods/default`,
      {
        customerId: customerId,
        paymentMethodId: paymentMethod.id,
      }
    );

    console.log(
      `✅ Set default payment method API call succeeded with status: ${defaultResponse.status}`
    );

    // Test 6: List payment methods
    console.log("\nTest 6: Listing payment methods...");
    const listResponse = await axios.get(
      `${API_HOST}${BASE_PATH}/payment-methods?customerId=${customerId}`
    );

    console.log(
      `✅ List payment methods API call succeeded with status: ${listResponse.status}`
    );
    const paymentMethods = listResponse.data.data.data || [];
    console.log(`✅ Found ${paymentMethods.length} payment methods`);

    // Test 7: Process a card payment
    console.log("\nTest 7: Processing a card payment...");
    const cardPaymentResponse = await axios.post(
      `${API_HOST}${BASE_PATH}/process/card`,
      {
        payment_amount: 2500, // $25.00
        card_number: "4242424242424242",
        exp_month: "12",
        exp_year: "2030",
        cvv: "123",
        email: `test-api-${Date.now()}@example.com`,
        name: "Test Card Payment",
        description: "API Test Payment",
      }
    );

    console.log(
      `✅ Process card payment API call succeeded with status: ${cardPaymentResponse.status}`
    );
    console.log(
      `✅ Card payment status: ${
        cardPaymentResponse.data.data.status || "unknown"
      }`
    );

    // Summary
    console.log("\n=== Test Summary ===");
    console.log("✅ All API tests passed successfully");

    return true;
  } catch (error) {
    console.error("\n❌ API test failed with error:");
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log("Response data:", error.response.data);
    } else {
      console.error(error.message);
    }

    console.log("\n=== Test Summary ===");
    console.log("❌ API tests failed");

    return false;
  }
}

// Execute
testPaymentAPI().catch(console.error);
