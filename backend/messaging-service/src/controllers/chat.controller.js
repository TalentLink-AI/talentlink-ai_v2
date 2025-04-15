// src/controllers/chat.controller.js

const ChatRoom = require("../models/chat-room.model");
const ChatMessage = require("../models/chat-message.model");
const { getUserByAuth0Id } = require("../utils/userClient");

exports.getChatDetails = async (req, res) => {
  try {
    const roomId = req.params.id;
    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const messages = await ChatMessage.find({ room_id: roomId }).sort({
      createdAt: 1,
    });

    const currentUserId = req.user.sub;
    const otherUserId = room.members.find((id) => id !== currentUserId);

    const otherUser = await getUserByAuth0Id(otherUserId);

    const chatDetail = {
      ...room.toObject(),
      other_member: otherUser ? [otherUser] : [],
    };

    res.status(200).json({
      status: 200,
      data: {
        chatDetail,
        chats: messages,
      },
    });
  } catch (err) {
    console.error("getChatDetails error:", err);
    res.status(500).json({ message: "Failed to get chat details" });
  }
};

exports.getRoomDetail = async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    res.status(200).json({ status: 200, data: room });
  } catch (err) {
    res.status(500).json({ message: "Failed to load room detail" });
  }
};

exports.getRoomFiles = async (req, res) => {
  try {
    const files = await ChatMessage.find({
      room_id: req.params.id,
      chat_type: "file",
    }).sort({ createdAt: -1 });

    const fileData = files.map((msg) => ({
      files: msg.files || [],
      createdAt: msg.createdAt,
      from_user: msg.from,
    }));

    const allFiles = fileData.flatMap((msg) =>
      msg.files.map((f) => ({
        ...f,
        createdAt: msg.createdAt,
        from_user: msg.from_user,
      }))
    );

    const links = []; // Or extract from messages if you track them

    res.status(200).json({
      status: 200,
      data: {
        files: allFiles,
        links,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load room files" });
  }
};
