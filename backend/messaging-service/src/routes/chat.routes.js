// backend/messaging-service/src/routes/chat.routes.js
const express = require("express");
const router = express.Router();
const logger = require("../../logger");
const requireAuth = require("../middlewares/auth");
const ChatRoom = require("../models/chat-room.model");
const ChatMessage = require("../models/chat-message.model");
const chatRepo = require("../models/chat-repo"); // <-- missing
const { getUserByAuth0Id } = require("../utils/userClient");
const { Types } = require("mongoose");

const assertValidId = (id) => {
  if (!Types.ObjectId.isValid(id)) {
    const err = new Error("invalid_room_id");
    err.status = 400;
    throw err;
  }
};

// Debug middleware
router.use((req, res, next) => {
  logger.info(`Chat route accessed: ${req.method} ${req.originalUrl}`);
  next();
});

// Route to get all chats for a user
router.get("/list", requireAuth, async (req, res) => {
  const userId = req.auth.payload.sub;
  const search = (req.query.search || "").toLowerCase();

  const rooms = await ChatRoom.find({ members: userId }).sort({
    last_message_at: -1,
  });

  // Build response
  const data = await Promise.all(
    rooms.map(async (room) => {
      let otherUser = null;
      try {
        otherUser = await getUserByAuth0Id(otherId);
      } catch {}

      return {
        _id: room._id,
        members: room.members,
        last_message_text: room.last_message_text,
        last_message_at: room.last_message_at,
        unseen_count: room.unseen_count,
        other_member: otherUser ? [otherUser] : [],
      };
    })
  );

  // Optional search filter (by name)
  const filtered = search
    ? data.filter((c) =>
        c.other_member[0]?.full_name?.toLowerCase().includes(search)
      )
    : data;

  res.json({ status: 200, data: filtered });
});

// Route to get chat details
router.get("/chats/:id", requireAuth, async (req, res) => {
  try {
    const roomId = req.params.id;
    assertValidId(roomId);
    const userId = req.auth.payload.sub; // current user

    let room = await ChatRoom.findById(roomId);

    if (!room) {
      return res.status(404).json({ status: 404, message: "Room not found" });
    }

    const chats = await chatRepo.getMessageHistory(roomId, 50);

    const otherUserId = room.members.find((m) => m !== userId);
    const otherUser = otherUserId ? await getUserByAuth0Id(otherUserId) : null;

    const chatDetail = {
      ...room.toObject(),
      other_member: otherUser ? [otherUser] : [],
    };

    return res.json({ status: 200, data: { chatDetail, chats } });
  } catch (err) {
    console.error("get chat detail error:", err);
    return res.status(500).json({ message: "Failed to get chat details" });
  }
});

// Route to get room details
router.get("/room/detail/:id", requireAuth, async (req, res, next) => {
  try {
    assertValidId(req.params.id);
    const room = await ChatRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "room_not_found" });
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// Route to get room files
router.get("/room/files/:id", requireAuth, (req, res) => {
  try {
    const roomId = req.params.id;
    logger.info(`Getting room files for room: ${roomId}`);

    // Mock response
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

    // Mock response
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
