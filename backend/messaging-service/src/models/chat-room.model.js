// chat-room.model.js
const mongoose = require("mongoose");

const ChatRoomSchema = new mongoose.Schema({
  members: [String],
  unseen_count: [
    {
      user_id: String,
      count: Number,
    },
  ],
  last_message_at: Date,
  last_message_text: String,
});

module.exports = mongoose.model("ChatRoom", ChatRoomSchema);
