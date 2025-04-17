// chat-message.model.js
const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
  {
    room_id: { type: String, ref: "ChatRoom" }, // <- string fk
    from: { type: String, required: true },
    text: String,
    type: { type: String, enum: ["text", "file", "typing"], default: "text" },
    meta_data: Object,
    files: [{ file: String, type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
