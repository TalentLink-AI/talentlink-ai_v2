// backend/messaging-service/src/models/chat-repo.js
const ChatRoom = require("./chat-room.model");
const ChatMessage = require("./chat-message.model");
const logger = require("../../logger");

module.exports = {
  // Save a new message
  saveMessage: async (data) => {
    try {
      const message = await ChatMessage.create(data);

      // Update the room with last message info
      if (data.text && data.room_id) {
        await ChatRoom.findByIdAndUpdate(
          data.room_id,
          {
            last_message_text: data.text.substring(0, 100),
            last_message_at: new Date(),
          },
          { new: true }
        );
      }

      return message;
    } catch (err) {
      logger.error(`Error saving message: ${err.message}`);
      throw err;
    }
  },

  // Get messages for a room
  getMessagesByRoom: (roomId) =>
    ChatMessage.find({ room_id: roomId }).sort({ createdAt: 1 }),

  // Find or create a private room between 2 users
  createOrFindRoom: async (user1, user2) => {
    try {
      // Sort member IDs for consistency
      const memberPair = [user1, user2].sort();

      // Try to find existing room
      let room = await ChatRoom.findOne({
        members: { $all: memberPair, $size: 2 },
      });

      if (room) {
        return room;
      }

      // Create new room
      return ChatRoom.create({
        members: memberPair,
        unseen_count: [
          { user_id: user1, count: 0 },
          { user_id: user2, count: 0 },
        ],
        last_message_at: new Date(),
      });
    } catch (err) {
      logger.error(`Error creating/finding room: ${err.message}`);
      throw err;
    }
  },

  getUserRooms: (userId) =>
    ChatRoom.find({ members: userId }).sort({ last_message_at: -1 }),

  getRoomById: (roomId) => ChatRoom.findById(roomId),

  // Reset unseen message count for a user
  markMessagesSeen: async (roomId, userId) => {
    try {
      const room = await ChatRoom.findById(roomId);
      if (!room) return null;

      // Update unseen count for the user
      room.unseen_count = room.unseen_count.map((entry) =>
        entry.user_id === userId ? { user_id: entry.user_id, count: 0 } : entry
      );

      return room.save();
    } catch (err) {
      logger.error(`Error marking messages seen: ${err.message}`);
      throw err;
    }
  },

  // Increment unseen for everyone except sender
  incrementUnseenForOthers: async (roomId, senderId) => {
    try {
      const room = await ChatRoom.findById(roomId);
      if (!room) return;

      room.unseen_count = room.unseen_count.map((entry) => ({
        user_id: entry.user_id,
        count: entry.user_id === senderId ? 0 : entry.count + 1,
      }));

      room.last_message_at = new Date();
      return room.save();
    } catch (err) {
      logger.error(`Error incrementing unseen count: ${err.message}`);
      throw err;
    }
  },

  /**
   * Get chat history for a room
   * @param {String} roomId - The room ID
   * @param {Number} limit - Max number of messages to return
   * @returns {Promise<Array>} - Array of message objects
   */
  getMessageHistory: async (roomId, limit = 50) => {
    try {
      return ChatMessage.find({ room_id: roomId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .then((messages) => messages.reverse());
    } catch (err) {
      logger.error(`Error getting message history: ${err.message}`);
      return [];
    }
  },

  /**
   * Get list of all users with last messages
   * @param {String} userId - Current user ID
   * @returns {Promise<Array>} - Array of user chat previews
   */
  getUserChats: async (userId) => {
    try {
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
        const lastMessage = await ChatMessage.findOne({ room_id: room._id })
          .sort({ createdAt: -1 })
          .lean();

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
    } catch (err) {
      logger.error(`Error getting user chats: ${err.message}`);
      return [];
    }
  },
};
