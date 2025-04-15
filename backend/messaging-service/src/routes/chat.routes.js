const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chat.controller");
const { verifyToken } = require("../utils/auth0");
const requireAuth = require("../middlewares/auth");

// These MUST match frontend requests exactly
router.get(
  "/chats/:id",
  verifyToken,
  requireAuth,
  chatController.getChatDetails
);
router.get(
  "/room/detail/:id",
  verifyToken,
  requireAuth,
  chatController.getRoomDetail
);
router.get(
  "/room/files/:id",
  verifyToken,
  requireAuth,
  chatController.getRoomFiles
);

module.exports = router;
