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
    const memberPair = [user1, user2].sort();

    let room = await ChatRoom.findOne({
      members: { $all: memberPair, $size: 2 },
    });
    if (room) return room;

    return ChatRoom.create({
      members: memberPair,
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

  /**
   * Get chat history for a room
   * @param {String} roomId - The room ID
   * @param {Number} limit - Max number of messages to return
   * @returns {Promise<Array>} - Array of message objects
   */
  getMessageHistory: async (roomId, limit = 50) => {
    return ChatMessage.find({ room_id: roomId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .then((messages) => messages.reverse());
  },

  /**
   * Get list of all users with last messages
   * @param {String} userId - Current user ID
   * @returns {Promise<Array>} - Array of user chat previews
   */
  getUserChats: async (userId) => {
    // Find all rooms for the user
    const rooms = await ChatRoom.find({ members: userId }).sort({
      last_message_at: -1,
    });

    // For each room, get the other user and the last message
    const chatPreviews = [];

    for (const room of rooms) {
      // Get the other user in the room
      const otherUserId = room.members.find((id) => id !== userId);

      // Get last message
      const lastMessage = await ChatMessage.findOne({ room_id: room._id }).sort(
        { createdAt: -1 }
      );

      // Get unread count for current user
      let unreadCount = 0;
      const userCountObj = room.unseen_count.find(
        (item) => item.user_id === userId
      );
      if (userCountObj) {
        unreadCount = userCountObj.count;
      }

      chatPreviews.push({
        roomId: room._id,
        userId: otherUserId,
        lastMessage: lastMessage
          ? {
              text: lastMessage.text,
              timestamp: lastMessage.createdAt,
              senderId: lastMessage.from,
            }
          : null,
        unreadCount,
      });
    }

    return chatPreviews;
  },
};
