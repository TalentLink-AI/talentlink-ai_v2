// backend/messaging-service/src/controllers/socket.controller.js
const { verifyToken } = require("../utils/auth0");
const chatRepo = require("../models/chat-repo");
const { Types } = require("mongoose");
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
          logger.info(
            `[Join] Rooms socket is in: ${Array.from(socket.rooms).join(", ")}`
          );

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

          // 1️⃣  make sure a room exists (or get the existing one)
          const roomDoc = await chatRepo.createOrFindRoom(userId, otherUserId);
          const roomId = roomDoc._id.toString(); // <-- real Mongo id

          // 2️⃣  rate‑limit duplicate joins (unchanged)
          const joinKey = `${userId}:${otherUserId}`;
          if (activeJoins.get(joinKey)) return;
          activeJoins.set(joinKey, true);
          setTimeout(() => activeJoins.delete(joinKey), 2_000);

          // 3️⃣  already in the room?
          if (socket.rooms.has(roomId)) {
            socket.emit("joined-room", { roomId, otherUserId });
            return;
          }

          // 4️⃣  join & track
          socket.join(roomId);
          let rooms = userRooms.get(userId) || [];
          if (!rooms.includes(roomId)) {
            rooms.push(roomId);
            userRooms.set(userId, rooms);
          }

          socket.emit("joined-room", { roomId, otherUserId });
          logger.info(`${userId} joined mongo room ${roomId}`);
        } catch (err) {
          logger.error(`Error joining room: ${err.message}`);
          socket.emit("error", { message: "Failed to join room" });
        }
      });

      // 🔸 Send Message
      socket.on("message", async ({ roomId, text }) => {
        try {
          logger.info(
            `[SRV] msg event from ${socket.userId} in ${roomId}: "${text}"`
          );
          // Validate the incoming data
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

          // Create mock message for testing
          const message = {
            _id: `msg_${Date.now()}`,
            room_id: roomId,
            from: userId,
            from_id: userId,
            text,
            type: "text",
            chat_type: "text",
            createdAt: new Date(),
          };

          // Important: Use io.to(roomId).emit to send to ALL clients in the room
          // including the sender (for consistent UI updates)
          io.to(roomId).emit("message", message);
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
          const messages = await ChatMessage.find({ room_id: roomId })
            .sort({ createdAt: 1 })
            .lean();

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

          // Mock chats for testing
          const chats = [
            {
              roomId: `room_${userId}_otheruser123`,
              userId: "otheruser123",
              lastMessage: {
                text: "Hello, this is a test message",
                timestamp: new Date(),
                senderId: userId,
              },
              unreadCount: 0,
            },
          ];

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

        // Don't remove from userRooms so we can auto-rejoin later
        // But we could set a timeout to remove after some period of inactivity
      });
    } catch (error) {
      logger.error(`Unhandled socket error: ${error.message}`);
      socket.disconnect(true);
    }
  });
};
