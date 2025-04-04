// webhook-test.js
// Save this file to your payment-service directory
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Configure these values
const WEBHOOK_ENDPOINT_URL =
  process.env.WEBHOOK_URL || "https://localhost:3002/api/webhooks/stripe";
const EVENTS_TO_TEST = [
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.processing",
];

async function testWebhooks() {
  console.log("🧪 Testing Stripe Webhooks...\n");

  try {
    // Step 1: List existing webhook endpoints
    console.log("Listing existing webhook endpoints...");
    const webhookEndpoints = await stripe.webhookEndpoints.list();

    const existingEndpoint = webhookEndpoints.data.find(
      (endpoint) => endpoint.url === WEBHOOK_ENDPOINT_URL
    );

    if (existingEndpoint) {
      console.log(
        `✅ Found existing webhook endpoint with ID: ${existingEndpoint.id}`
      );
      console.log(`   URL: ${existingEndpoint.url}`);
      console.log(
        `   Enabled events: ${existingEndpoint.enabled_events.join(", ")}`
      );

      // Step 2: Send test webhook events
      console.log("\nSending test webhook events...");

      for (const eventType of EVENTS_TO_TEST) {
        console.log(`\nSending test ${eventType} webhook event...`);

        try {
          const webhookEvent =
            await stripe.webhookEndpoints.createWebhookEndpointTest(
              existingEndpoint.id,
              { enabled_event: eventType }
            );
          console.log(`✅ Test webhook event ${eventType} sent successfully`);
        } catch (err) {
          console.error(
            `❌ Failed to send test webhook event ${eventType}: ${err.message}`
          );
        }
      }
    } else {
      console.log(
        `❌ No webhook endpoint found with URL: ${WEBHOOK_ENDPOINT_URL}`
      );
      console.log("Available webhook endpoints:");
      webhookEndpoints.data.forEach((endpoint) => {
        console.log(` - ${endpoint.url} (ID: ${endpoint.id})`);
      });

      console.log(
        "\nWould you like to create a new webhook endpoint? To create one, run:"
      );
      console.log(`
stripe listen --forward-to your-local-url/api/webhooks/stripe

Or via API:
stripe.webhookEndpoints.create({
  url: '${WEBHOOK_ENDPOINT_URL}',
  enabled_events: ${JSON.stringify(EVENTS_TO_TEST)},
});
      `);
    }

    // Step 3: Create a live test payment if webhook endpoint exists
    if (existingEndpoint) {
      console.log("\nCreating a real payment to trigger webhooks...");

      // Create a customer
      const customer = await stripe.customers.create({
        email: `webhook-test-${Date.now()}@example.com`,
        name: "Webhook Test User",
      });
      console.log(`✅ Created test customer: ${customer.id}`);

      // Create a payment method
      const paymentMethod = await stripe.paymentMethods.create({
        type: "card",
        card: {
          number: "4242424242424242",
          exp_month: 12,
          exp_year: 2030,
          cvc: "123",
        },
      });
      console.log(`✅ Created test payment method: ${paymentMethod.id}`);

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: customer.id,
      });
      console.log(`✅ Attached payment method to customer`);

      // Create and confirm payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 2000,
        currency: "usd",
        customer: customer.id,
        payment_method: paymentMethod.id,
        confirm: true,
        description: "Webhook test payment",
        metadata: {
          test: "true",
          webhook_test: "true",
        },
      });

      console.log(
        `✅ Created and confirmed payment intent: ${paymentIntent.id}`
      );
      console.log(`   Status: ${paymentIntent.status}`);

      // Wait for webhook processing
      console.log("\nWaiting 10 seconds for webhooks to be processed...");
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Check events
      const events = await stripe.events.list({
        type: "payment_intent.succeeded",
        limit: 5,
      });

      const relevantEvent = events.data.find(
        (event) => event.data.object.id === paymentIntent.id
      );

      if (relevantEvent) {
        console.log(
          `✅ Found payment_intent.succeeded event for payment intent: ${paymentIntent.id}`
        );
        console.log(`   Event ID: ${relevantEvent.id}`);
        console.log(
          `   Created: ${new Date(relevantEvent.created * 1000).toISOString()}`
        );
      } else {
        console.log(
          `❌ No payment_intent.succeeded event found for payment intent: ${paymentIntent.id}`
        );
      }

      // Clean up
      console.log("\nCleaning up test data...");
      await stripe.customers.del(customer.id);
      console.log("✅ Test customer deleted");
    }

    console.log("\n=== Webhook Test Summary ===");
    if (existingEndpoint) {
      console.log("✅ Webhook endpoint found and test events sent");
      console.log("✅ Live payment created to trigger actual webhooks");
      console.log(
        "\nCheck your webhook logs or database to verify the events were processed correctly"
      );
    } else {
      console.log("❌ No webhook endpoint found matching the URL");
      console.log(
        "Please create a webhook endpoint first, then run this test again"
      );
    }
  } catch (error) {
    console.error("\n❌ Webhook test failed with error:");
    console.error(error.message);
  }
}

// Execute
testWebhooks().catch(console.error);
