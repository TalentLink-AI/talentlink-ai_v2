const ChatRoom = require("./chat-room.model");
const ChatMessage = require("./chat-message.model");

module.exports = {
  // Save a new message
  saveMessage: (data) => ChatMessage.create(data),

  // Get messages for a room
  getMessagesByRoom: (roomId) =>
    ChatMessage.find({ room_id: roomId }).sort({ createdAt: 1 }),

  // Find or create a private room between 2 users
  createOrFindRoom: async (user1, user2) => {
    const existing = await ChatRoom.findOne({
      members: { $all: [user1, user2], $size: 2 },
    });

    if (existing) return existing;

    return ChatRoom.create({
      members: [user1, user2],
      unseen_count: [
        { user_id: user1, count: 0 },
        { user_id: user2, count: 0 },
      ],
    });
  },

  getUserRooms: (userId) =>
    ChatRoom.find({ members: userId }).sort({ last_message_at: -1 }),

  getRoomById: (roomId) => ChatRoom.findById(roomId),

  // Reset unseen message count for a user
  markMessagesSeen: async (roomId, userId) => {
    const room = await ChatRoom.findById(roomId);
    if (!room) return null;

    room.unseen_count = room.unseen_count.map((entry) =>
      entry.user_id === userId ? { ...entry.toObject(), count: 0 } : entry
    );
    return room.save();
  },

  // Increment unseen for everyone except sender
  incrementUnseenForOthers: async (roomId, senderId) => {
    const room = await ChatRoom.findById(roomId);
    if (!room) return;

    room.unseen_count = room.unseen_count.map((entry) => ({
      user_id: entry.user_id,
      count: entry.user_id === senderId ? 0 : entry.count + 1,
    }));
    room.last_message_at = new Date();
    return room.save();
  },
};
