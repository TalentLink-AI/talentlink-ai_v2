// Replace or update backend/messaging-service/src/routes/chat.routes.js
const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chat.controller");
const { verifyToken } = require("../utils/auth0");
const requireAuth = require("../middlewares/auth");
const logger = require("../../logger");

// Debug middleware
router.use((req, res, next) => {
  logger.info(`Chat route accessed: ${req.method} ${req.originalUrl}`);
  next();
});

// Route to get all chats for a user
router.get("/list", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const searchQuery = req.query.search || "";

    logger.info(
      `Getting chat list for user: ${userId}, search: ${searchQuery}`
    );

    // Mock response for testing
    res.status(200).json({
      status: 200,
      data: [
        {
          _id: "67fec8386390a1854ba2025d",
          members: [userId, "auth0|otheruser123"],
          last_message_text: "Hello, how are you?",
          last_message_at: new Date(),
          unseen_count: 0,
          other_member: [
            {
              _id: "auth0|otheruser123",
              full_name: "John Doe",
              profile_image: null,
              is_online: true,
            },
          ],
        },
      ],
    });
  } catch (error) {
    logger.error(`Error getting chat list: ${error.message}`);
    res.status(500).json({ message: "Failed to get chat list" });
  }
});

// These MUST match frontend requests exactly
router.get("/chats/:id", requireAuth, (req, res) => {
  try {
    const roomId = req.params.id;
    logger.info(`Getting chat details for room: ${roomId}`);

    // Mock response for testing
    res.status(200).json({
      status: 200,
      data: {
        chatDetail: {
          _id: roomId,
          members: [req.auth.payload.sub, "auth0|otheruser123"],
          other_member: [
            {
              _id: "auth0|otheruser123",
              full_name: "John Doe",
              profile_image: null,
              is_online: true,
            },
          ],
        },
        chats: [],
      },
    });
  } catch (error) {
    logger.error(`Error getting chat details: ${error.message}`);
    res.status(500).json({ message: "Failed to get chat details" });
  }
});

router.get("/room/detail/:id", requireAuth, (req, res) => {
  try {
    const roomId = req.params.id;
    logger.info(`Getting room details for room: ${roomId}`);

    // Mock response for testing
    res.status(200).json({
      status: 200,
      data: {
        _id: roomId,
        members: [req.auth.payload.sub, "auth0|otheruser123"],
        last_message_at: new Date(),
        unseen_count: [],
      },
    });
  } catch (error) {
    logger.error(`Error getting room details: ${error.message}`);
    res.status(500).json({ message: "Failed to get room details" });
  }
});

router.get("/room/files/:id", requireAuth, (req, res) => {
  try {
    const roomId = req.params.id;
    logger.info(`Getting room files for room: ${roomId}`);

    // Mock response for testing
    res.status(200).json({
      status: 200,
      data: {
        files: [],
        links: [],
      },
    });
  } catch (error) {
    logger.error(`Error getting room files: ${error.message}`);
    res.status(500).json({ message: "Failed to get room files" });
  }
});

// File uploads
router.post("/attachments", requireAuth, (req, res) => {
  try {
    logger.info(`File upload request received`);

    // Mock response for testing
    res.status(200).json({
      status: 200,
      message: "Files uploaded successfully",
    });
  } catch (error) {
    logger.error(`Error uploading files: ${error.message}`);
    res.status(500).json({ message: "Failed to upload files" });
  }
});

module.exports = router;
