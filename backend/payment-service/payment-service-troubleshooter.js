// payment-service-troubleshooter.js
// Save this file to your payment-service directory

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load env variables
if (fs.existsSync(path.join(__dirname, ".env"))) {
  console.log("Loading .env file");
  dotenv.config();
} else {
  console.log("No .env file found");
}

console.log("\n=== Environment Variables Check ===");
const requiredEnvVars = [
  "MONGODB_URI",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

let missingVars = false;
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.log(`❌ Missing required env var: ${varName}`);
    missingVars = true;
  } else {
    // Only show prefix for sensitive keys
    const value =
      varName.includes("KEY") || varName.includes("SECRET")
        ? `${process.env[varName].substring(0, 5)}...`
        : process.env[varName];
    console.log(`✅ ${varName}: ${value}`);
  }
});

if (!missingVars) {
  console.log("All required environment variables are set");
}

// Check MongoDB connection
async function checkMongoDB() {
  console.log("\n=== MongoDB Connection Test ===");
  try {
    const mongoose = require("mongoose");
    console.log(
      `Attempting to connect to: ${
        process.env.MONGODB_URI || "MONGODB_URI not set"
      }`
    );

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Check if we can perform basic operations
    const testSchema = new mongoose.Schema({
      name: String,
      testDate: { type: Date, default: Date.now },
    });
    const TestModel =
      mongoose.models.Test || mongoose.model("Test", testSchema);

    // Try to write & read
    const testDoc = new TestModel({ name: "Connection Test" });
    await testDoc.save();
    console.log("✅ Successfully wrote test document to MongoDB");

    const foundDoc = await TestModel.findById(testDoc._id);
    console.log("✅ Successfully read test document from MongoDB");

    // Clean up
    await TestModel.deleteOne({ _id: testDoc._id });

    return true;
  } catch (error) {
    console.log(`❌ MongoDB Connection Error: ${error.message}`);
    return false;
  }
}

// Test Stripe connection
async function checkStripe() {
  console.log("\n=== Stripe API Connection Test ===");
  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    console.log(
      "Initialized Stripe with key starting with: " +
        process.env.STRIPE_SECRET_KEY.substring(0, 5) +
        "..."
    );

    const customer = await stripe.customers.create({
      email: `test-${Date.now()}@example.com`,
      name: "Test User",
      metadata: { test: "true" },
    });

    console.log(`✅ Successfully created Stripe test customer: ${customer.id}`);

    // Clean up
    await stripe.customers.del(customer.id);
    console.log(`✅ Successfully deleted Stripe test customer`);

    return true;
  } catch (error) {
    console.log(`❌ Stripe API Error: ${error.message}`);
    return false;
  }
}

// Check Express configuration
function checkExpressConfig() {
  console.log("\n=== Express Configuration Check ===");

  try {
    const serverFilePath = path.join(__dirname, "src", "server.js");
    const serverFile = fs.readFileSync(serverFilePath, "utf8");

    // Check for common issues
    if (
      serverFile.includes("express.raw") &&
      !serverFile.includes("express.json")
    ) {
      console.log(
        "⚠️ Server might not be properly parsing JSON for regular routes"
      );
    } else {
      console.log("✅ Basic JSON middleware appears to be configured");
    }

    // Check for appropriate error handling
    if (serverFile.includes("app.use((err, req, res, next)")) {
      console.log("✅ Error handling middleware found");
    } else {
      console.log("⚠️ No error handling middleware detected");
    }

    // Check webhook handling
    if (
      serverFile.includes("/api/webhooks/stripe") &&
      serverFile.includes("express.raw")
    ) {
      console.log(
        "✅ Webhook handling with raw body parser appears to be configured"
      );
    } else {
      console.log("⚠️ Webhook configuration might be incomplete");
    }

    return true;
  } catch (error) {
    console.log(`❌ Error checking Express config: ${error.message}`);
    return false;
  }
}

// Run all checks
async function runDiagnostics() {
  console.log("🔍 Running Payment Service Diagnostics...\n");

  // Check for correct directory structure
  console.log("=== Directory Structure Check ===");
  const requiredDirs = ["src", "src/controllers", "src/models", "src/routes"];
  requiredDirs.forEach((dir) => {
    if (fs.existsSync(path.join(__dirname, dir))) {
      console.log(`✅ ${dir} directory exists`);
    } else {
      console.log(`❌ ${dir} directory not found`);
    }
  });

  // Check Express config
  checkExpressConfig();

  // Check DB and Stripe connections
  const dbConnected = await checkMongoDB();
  const stripeConnected = await checkStripe();

  console.log("\n=== Diagnostic Summary ===");
  console.log(
    `MongoDB Connection: ${dbConnected ? "✅ Success" : "❌ Failed"}`
  );
  console.log(
    `Stripe API Connection: ${stripeConnected ? "✅ Success" : "❌ Failed"}`
  );

  if (dbConnected && stripeConnected) {
    console.log("\n✅ Core services appear to be working correctly");
    console.log("\nIf you still have API issues, check the following:");
    console.log("1. API Gateway routing (check for correct path forwarding)");
    console.log(
      "2. Request payload format (check documentation for required fields)"
    );
    console.log(
      "3. Network connectivity between services (container networking)"
    );
    console.log("4. Middleware order/configuration in server.js");
  } else {
    console.log("\n❌ Found issues with core services - fix these first");
  }

  console.log("\nFor detailed API testing, you can run:");
  console.log(
    'curl -X POST http://localhost:3002/api/payment/customers -H "Content-Type: application/json" -d \'{"email":"test@example.com", "name":"Test User"}\''
  );
}

// Execute
runDiagnostics().catch(console.error);
