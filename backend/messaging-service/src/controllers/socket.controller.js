// backend/messaging-service/src/controllers/socket.controller.js
const { verifyToken } = require("../utils/auth0");
const chatRepo = require("../models/chat-repo");
const ChatMessage = require("../models/chat-message.model");
const logger = require("../../logger");

// Track user rooms - this will persist across reconnections
const userRooms = new Map();
const connectedUsers = new Map();
const activeJoins = new Map();

module.exports = (io) => {
  // Middleware for socket authentication
  io.use(async (socket, next) => {
    try {
      // Get token from auth object
      const token = socket.handshake.auth?.token;

      if (!token || typeof token !== "string") {
        logger.error("Socket auth failed: No valid token");
        return next(new Error("Authentication required"));
      }

      try {
        // Verify the token
        const decoded = await verifyToken(token);

        // Store user ID on the socket
        socket.userId = decoded.sub;
        logger.info(
          `Socket authenticated: ${socket.id} for user ${socket.userId}`
        );

        next();
      } catch (err) {
        logger.error(`Socket auth token verification error: ${err.message}`);
        next(new Error("Authentication failed"));
      }
    } catch (err) {
      logger.error(`Socket middleware error: ${err.message}`);
      next(new Error("Socket middleware error"));
    }
  });

  io.on("connection", async (socket) => {
    try {
      if (!socket.userId) {
        logger.error("Socket missing userId after auth");
        return socket.disconnect(true);
      }

      const userId = socket.userId;
      logger.info(`✅ Socket connected: ${socket.id} as user ${userId}`);

      // Track connected users
      connectedUsers.set(userId, socket.id);

      // Check if this user has active rooms to rejoin
      const activeRooms = userRooms.get(userId) || [];
      if (activeRooms.length > 0) {
        logger.info(
          `User ${userId} reconnected, rejoining rooms: ${activeRooms.join(
            ", "
          )}`
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
          if (!otherUserId) {
            socket.emit("error", { message: "Missing otherUserId" });
            return;
          }

          logger.info(
            `User ${userId} requesting to join room with ${otherUserId}`
          );

          // 1️⃣  Create or find room
          const roomDoc = await chatRepo.createOrFindRoom(userId, otherUserId);
          const roomId = roomDoc._id.toString();

          // 2️⃣  Rate-limit duplicate joins
          const joinKey = `${userId}:${otherUserId}`;
          if (activeJoins.get(joinKey)) {
            logger.info(`Rate limiting join request for ${joinKey}`);
            return;
          }

          activeJoins.set(joinKey, true);
          setTimeout(() => activeJoins.delete(joinKey), 2000);

          // 3️⃣  Check if already in the room
          if (socket.rooms.has(roomId)) {
            logger.info(`User ${userId} already in room ${roomId}`);
            socket.emit("joined-room", { roomId, otherUserId });
            return;
          }

          // 4️⃣  Join & track
          socket.join(roomId);
          let rooms = userRooms.get(userId) || [];
          if (!rooms.includes(roomId)) {
            rooms.push(roomId);
            userRooms.set(userId, rooms);
          }

          // Clear unread messages when joining
          await chatRepo.markMessagesSeen(roomId, userId);

          socket.emit("joined-room", { roomId, otherUserId });
          logger.info(`${userId} joined room ${roomId}`);
        } catch (err) {
          logger.error(`Error joining room: ${err.message}`);
          socket.emit("error", { message: "Failed to join room" });
        }
      });

      // Handle "rejoin" for reconnection
      socket.on("rejoin", async ({ roomId }) => {
        try {
          if (!roomId) {
            socket.emit("error", { message: "Missing roomId" });
            return;
          }

          logger.info(`User ${userId} rejoining room ${roomId}`);
          socket.join(roomId);

          // Update room tracking
          let rooms = userRooms.get(userId) || [];
          if (!rooms.includes(roomId)) {
            rooms.push(roomId);
            userRooms.set(userId, rooms);
          }

          socket.emit("rejoined", { roomId });
        } catch (err) {
          logger.error(`Error rejoining room: ${err.message}`);
          socket.emit("error", { message: "Failed to rejoin room" });
        }
      });

      // 🔸 Send Message
      socket.on("message", async ({ roomId, text }) => {
        try {
          if (!roomId || !text) {
            logger.error(`Missing roomId or text in message from ${userId}`);
            socket.emit("error", { message: "Missing roomId or text" });
            return;
          }

          logger.info(
            `Message from ${userId} in room ${roomId}: ${text.substring(
              0,
              30
            )}...`
          );

          // Save the message
          const messageData = {
            room_id: roomId,
            from: userId,
            text,
            type: "text",
            chat_type: "text",
            createdAt: new Date(),
          };

          const savedMessage = await chatRepo.saveMessage(messageData);

          // Increment unread count for other users
          await chatRepo.incrementUnseenForOthers(roomId, userId);

          // Broadcast to everyone in the room
          io.to(roomId).emit("message", savedMessage);
        } catch (error) {
          logger.error(`Error sending message: ${error.message}`);
          socket.emit("error", { message: "Failed to send message" });
        }
      });

      // 🔸 Mark Messages as Seen
      socket.on("seen", async ({ roomId }) => {
        try {
          if (!roomId) {
            logger.error(`Missing roomId in seen event from ${userId}`);
            socket.emit("error", { message: "Missing roomId" });
            return;
          }

          logger.info(
            `User ${userId} marked messages as seen in room ${roomId}`
          );
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
          logger.error(
            `Missing roomId or status in typing event from ${userId}`
          );
          socket.emit("error", { message: "Missing roomId or status" });
          return;
        }

        logger.info(`User ${userId} typing status ${status} in room ${roomId}`);
        socket.to(roomId).emit("typing", { from: userId, status });
      });

      // 🔸 Get Chat History
      socket.on("get-history", async ({ roomId }, callback) => {
        try {
          if (!roomId) {
            logger.warn(`Missing roomId in get-history from ${userId}`);
            return callback([]);
          }

          logger.info(`Fetching chat history for room ${roomId}`);
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
          logger.info(`Getting user chats for ${userId}`);
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
        connectedUsers.delete(userId);

        // We don't remove from userRooms to support auto-rejoin on reconnection
      });
    } catch (error) {
      logger.error(`Unhandled socket error: ${error.message}`);
      socket.disconnect(true);
    }
  });
};
