const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");

// Auth0 webhook endpoint
router.post("/auth0", webhookController.handleAuth0Webhook);

module.exports = router;
