// backend/payment-service/src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { v4: uuidv4 } = require("uuid");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan("combined"));

// Mock data storage (for development purposes only)
const paymentMethods = [];
const transactions = [];
const escrowAccounts = {};

// Payment methods endpoints
app.get("/payment-methods", (req, res) => {
  console.log("GET /payment-methods");
  res.json(paymentMethods);
});

app.post("/payment-methods", (req, res) => {
  console.log("POST /payment-methods", req.body);
  const { paymentMethodId } = req.body;

  if (!paymentMethodId) {
    return res.status(400).json({ message: "Payment method ID is required" });
  }

  // Simulate creating a payment method
  const paymentMethod = {
    id: paymentMethodId,
    type: "card",
    card: {
      brand: "visa",
      last4: "4242",
      expMonth: 12,
      expYear: 2025,
    },
    created: new Date().toISOString(),
  };

  paymentMethods.push(paymentMethod);
  res.status(201).json(paymentMethod);
});

app.delete("/payment-methods/:id", (req, res) => {
  console.log("DELETE /payment-methods/" + req.params.id);
  const index = paymentMethods.findIndex((pm) => pm.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: "Payment method not found" });
  }

  paymentMethods.splice(index, 1);
  res.json({ success: true });
});

// Escrow endpoints
app.post("/escrow", (req, res) => {
  console.log("POST /escrow", req.body);
  const { contractId, amount } = req.body;

  if (!contractId || !amount) {
    return res
      .status(400)
      .json({ message: "Contract ID and amount are required" });
  }

  const escrowId = uuidv4();
  const escrow = {
    id: escrowId,
    contractId,
    balance: 0,
    initialAmount: amount,
    status: "active",
    createdAt: new Date().toISOString(),
  };

  escrowAccounts[escrowId] = escrow;
  res.status(201).json(escrow);
});

app.post("/escrow/:id/fund", (req, res) => {
  console.log("POST /escrow/" + req.params.id + "/fund", req.body);
  const { paymentMethodId, amount } = req.body;
  const escrowId = req.params.id;

  if (!paymentMethodId || !amount) {
    return res
      .status(400)
      .json({ message: "Payment method ID and amount are required" });
  }

  if (!escrowAccounts[escrowId]) {
    return res.status(404).json({ message: "Escrow account not found" });
  }

  // Simulate a successful payment intent
  const paymentIntent = {
    id: uuidv4(),
    amount,
    status: "succeeded",
  };

  // Update escrow balance
  escrowAccounts[escrowId].balance += parseInt(amount);

  // Record transaction
  transactions.push({
    id: uuidv4(),
    type: "escrow_funding",
    amount,
    escrowId,
    paymentMethodId,
    status: "completed",
    createdAt: new Date().toISOString(),
  });

  res.json(paymentIntent);
});

app.get("/escrow/:id/balance", (req, res) => {
  console.log("GET /escrow/" + req.params.id + "/balance");
  const escrowId = req.params.id;

  if (!escrowAccounts[escrowId]) {
    return res.status(404).json({ message: "Escrow account not found" });
  }

  res.json({ balance: escrowAccounts[escrowId].balance });
});

// Milestone endpoints
app.get("/contracts/:contractId/milestones", (req, res) => {
  console.log("GET /contracts/" + req.params.contractId + "/milestones");
  // Return some mock milestones
  res.json([
    {
      id: "milestone1",
      title: "Project Setup",
      description: "Initial project setup and requirements gathering",
      amount: 1000,
      status: "paid",
      dueDate: "2025-05-01T00:00:00.000Z",
      completedDate: "2025-04-15T00:00:00.000Z",
      paidDate: "2025-04-18T00:00:00.000Z",
    },
    {
      id: "milestone2",
      title: "Frontend Implementation",
      description: "Implement all frontend components and pages",
      amount: 2000,
      status: "completed",
      dueDate: "2025-06-01T00:00:00.000Z",
      completedDate: "2025-05-25T00:00:00.000Z",
    },
    {
      id: "milestone3",
      title: "Backend Integration",
      description: "Connect frontend with backend APIs",
      amount: 1500,
      status: "inProgress",
      dueDate: "2025-07-01T00:00:00.000Z",
    },
    {
      id: "milestone4",
      title: "Testing and Deployment",
      description: "Final testing and production deployment",
      amount: 1000,
      status: "pending",
      dueDate: "2025-08-01T00:00:00.000Z",
    },
  ]);
});

app.patch("/contracts/:contractId/milestones/:milestoneId", (req, res) => {
  console.log(
    `PATCH /contracts/${req.params.contractId}/milestones/${req.params.milestoneId}`,
    req.body
  );
  const { status } = req.body;

  // Simulate updating a milestone
  res.json({
    id: req.params.milestoneId,
    title: "Sample Milestone",
    description: "Sample description",
    amount: 1000,
    status,
    dueDate: "2025-05-01T00:00:00.000Z",
    completedDate: status === "completed" ? new Date().toISOString() : null,
  });
});

app.post(
  "/contracts/:contractId/milestones/:milestoneId/release",
  (req, res) => {
    console.log(
      `POST /contracts/${req.params.contractId}/milestones/${req.params.milestoneId}/release`
    );

    // Simulate releasing a milestone payment
    res.json({
      id: req.params.milestoneId,
      title: "Sample Milestone",
      description: "Sample description",
      amount: 1000,
      status: "paid",
      dueDate: "2025-05-01T00:00:00.000Z",
      completedDate: "2025-04-15T00:00:00.000Z",
      paidDate: new Date().toISOString(),
    });
  }
);

// Time-based payment endpoints
app.post("/contracts/:contractId/time-payment", (req, res) => {
  console.log(
    `POST /contracts/${req.params.contractId}/time-payment`,
    req.body
  );
  const { paymentMethodId, hours } = req.body;

  if (!paymentMethodId || !hours) {
    return res
      .status(400)
      .json({ message: "Payment method ID and hours are required" });
  }

  // Simulate a successful payment intent
  res.json({
    id: uuidv4(),
    amount: hours * 100, // Assuming $100/hour
    status: "succeeded",
  });
});

// Stripe Connect endpoints
app.get("/connect/account-link", (req, res) => {
  console.log("GET /connect/account-link");

  // Simulate Stripe Connect account link creation
  res.json({ url: "https://connect.stripe.com/setup/s/mock-account-link" });
});

app.get("/connect/status", (req, res) => {
  console.log("GET /connect/status");

  // Simulate Stripe Connect onboarding status
  res.json({ completed: true });
});

// Transaction history endpoint
app.get("/transactions", (req, res) => {
  console.log("GET /transactions");
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const paginatedTransactions = transactions.slice(skip, skip + limit);

  res.json({
    transactions: paginatedTransactions,
    pagination: {
      total: transactions.length,
      page,
      limit,
      pages: Math.ceil(transactions.length / limit),
    },
  });
});

// Stripe webhook endpoint
app.post("/webhook", (req, res) => {
  console.log("Received webhook event");

  // For development, just acknowledge all webhook events
  res.json({ received: true });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Payment service listening on port ${PORT}`);
});
