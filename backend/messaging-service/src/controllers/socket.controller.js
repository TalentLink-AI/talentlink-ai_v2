const { verifyToken } = require("../utils/auth0");
const chatRepo = require("../models/chat-repo");

module.exports = (io) => {
  io.on("connection", async (socket) => {
    const token = socket.handshake.headers["authorization"]?.split(" ")[1];

    let userId;
    try {
      const decoded = await verifyToken(token);
      userId = decoded.sub;
      console.log(`✅ Socket connected: ${socket.id} as user ${userId}`);
    } catch (err) {
      console.error("❌ Auth failed:", err.message);
      return socket.disconnect(true);
    }

    // 🔸 Join Room
    socket.on("join", async ({ otherUserId }) => {
      const room = await chatRepo.createOrFindRoom(userId, otherUserId);
      socket.join(room._id.toString());
      console.log(`${userId} joined room ${room._id}`);
      socket.emit("joined-room", room._id);
    });

    // 🔸 Send Message
    socket.on("message", async ({ roomId, text }) => {
      const message = await chatRepo.saveMessage({
        room_id: roomId,
        from: userId,
        text,
        type: "text",
      });

      await chatRepo.incrementUnseenForOthers(roomId, userId);

      io.to(roomId).emit("message", message);
    });

    // 🔸 Mark Messages as Seen
    socket.on("seen", async ({ roomId }) => {
      await chatRepo.markMessagesSeen(roomId, userId);
      io.to(roomId).emit("seen", { userId, roomId });
    });

    // 🔸 Typing (optional starter)
    socket.on("typing", ({ roomId, status }) => {
      socket.to(roomId).emit("typing", { from: userId, status });
    });

    // 🔸 Disconnect
    socket.on("disconnect", () => {
      console.log(`Socket ${socket.id} (${userId}) disconnected`);
    });
  });
};
