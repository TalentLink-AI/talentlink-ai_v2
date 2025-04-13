const mongoose = require("mongoose");

const ChatRoomSchema = new mongoose.Schema(
  {
    members: [{ type: String, required: true }], // store Auth0 user IDs
    last_message_text: { type: String, default: "" },
    last_message_at: { type: Date },
    unseen_count: [
      {
        user_id: { type: String },
        count: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatRoom", ChatRoomSchema);
