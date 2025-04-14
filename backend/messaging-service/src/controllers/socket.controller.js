// backend/messaging-service/src/controllers/socket.controller.js

const { verifyToken } = require("../utils/auth0");
const chatRepo = require("../models/chat-repo");
const logger = require("../../logger");

// Track user rooms - this will persist across reconnections
const userRooms = new Map();

module.exports = (io) => {
  io.on("connection", async (socket) => {
    const token = socket.handshake.headers["authorization"]?.split(" ")[1];

    let userId;
    try {
      const decoded = await verifyToken(token);
      userId = decoded.sub;
      logger.info(`✅ Socket connected: ${socket.id} as user ${userId}`);
    } catch (err) {
      logger.error("❌ Auth failed:", err.message);
      return socket.disconnect(true);
    }

    // Store user ID on the socket for reference
    socket.userId = userId;

    // Check if this user has active rooms to rejoin
    const activeRooms = userRooms.get(userId) || [];
    if (activeRooms.length > 0) {
      logger.info(
        `User ${userId} reconnected, rejoining rooms: ${activeRooms.join(", ")}`
      );

      // Rejoin all active rooms
      for (const roomId of activeRooms) {
        socket.join(roomId);
        logger.info(`Auto-rejoined user ${userId} to room ${roomId}`);
      }
    }

    // 🔸 Join Room
    socket.on("join", async ({ otherUserId }) => {
      try {
        // Validate the incoming data
        if (!otherUserId) {
          socket.emit("error", { message: "Missing otherUserId" });
          return;
        }

        const room = await chatRepo.createOrFindRoom(userId, otherUserId);

        // Make sure room has an _id and convert it to string
        if (!room || !room._id) {
          logger.error(
            `Failed to create/find room between ${userId} and ${otherUserId}`
          );
          socket.emit("error", { message: "Failed to create chat room" });
          return;
        }

        const roomId = room._id.toString();
        socket.join(roomId);

        // Track this room for the user for auto-rejoining
        let userActiveRooms = userRooms.get(userId) || [];
        if (!userActiveRooms.includes(roomId)) {
          userActiveRooms.push(roomId);
          userRooms.set(userId, userActiveRooms);
        }

        logger.info(`${userId} joined room ${roomId}`);
        socket.emit("joined-room", roomId);

        // Mark messages as seen when joining
        await chatRepo.markMessagesSeen(roomId, userId);
      } catch (error) {
        logger.error(`Error joining room: ${error.message}`);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // 🔸 Send Message
    socket.on("message", async ({ roomId, text }) => {
      try {
        // Validate the incoming data
        if (!roomId || !text) {
          socket.emit("error", { message: "Missing roomId or text" });
          return;
        }

        const message = await chatRepo.saveMessage({
          room_id: roomId,
          from: userId,
          text,
          type: "text",
        });

        // Update room's last message and increment unseen for others
        await chatRepo.incrementUnseenForOthers(roomId, userId);

        // Important: Use io.to(roomId).emit to send to ALL clients in the room
        // including the sender (for consistent UI updates)
        io.to(roomId).emit("message", message);
        console.log(`Message sent to room ${roomId} from ${userId}: ${text}`);
      } catch (error) {
        logger.error(`Error sending message: ${error.message}`);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // 🔸 Mark Messages as Seen
    socket.on("seen", async ({ roomId }) => {
      try {
        if (!roomId) {
          socket.emit("error", { message: "Missing roomId" });
          return;
        }

        await chatRepo.markMessagesSeen(roomId, userId);
        io.to(roomId).emit("seen", { userId, roomId });
      } catch (error) {
        logger.error(`Error marking messages as seen: ${error.message}`);
        socket.emit("error", { message: "Failed to mark messages as seen" });
      }
    });

    // 🔸 Typing Indicator
    socket.on("typing", ({ roomId, status }) => {
      if (!roomId || !status) {
        socket.emit("error", { message: "Missing roomId or status" });
        return;
      }

      socket.to(roomId).emit("typing", { from: userId, status });
    });

    // 🔸 Get Chat History
    socket.on("get-history", async ({ roomId }, callback) => {
      try {
        if (!roomId) {
          callback([]);
          return;
        }

        const messages = await chatRepo.getMessageHistory(roomId, 50);
        callback(messages);
      } catch (error) {
        logger.error(`Error getting chat history: ${error.message}`);
        callback([]);
      }
    });

    // 🔸 Get User Chats
    socket.on("get-user-chats", async (_, callback) => {
      try {
        const chats = await chatRepo.getUserChats(userId);
        callback(chats);
      } catch (error) {
        logger.error(`Error getting user chats: ${error.message}`);
        callback([]);
      }
    });

    // 🔸 Disconnect
    socket.on("disconnect", () => {
      logger.info(`Socket ${socket.id} (${userId}) disconnected`);
      // Don't remove from userRooms so we can auto-rejoin later
    });
  });
};
