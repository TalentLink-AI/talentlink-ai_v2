const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
  {
    room_id: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom" },
    from: { type: String, required: true }, // Auth0 user ID
    text: { type: String },
    type: { type: String, enum: ["text", "file", "typing"], default: "text" },
    meta_data: { type: Object },
    files: [
      {
        file: String,
        type: String, // e.g., image, video, etc.
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
