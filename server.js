
require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");

const mongoose = require("mongoose");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const msgRoutes = require("./routes/messages");
const userRoutes = require("./routes/users");

const GroupMessage = require("./models/GroupMessage");
const PrivateMessage = require("./models/PrivateMessage");

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: { origin: "*" }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend pages
app.use("/view", express.static(path.join(__dirname, "view")));
app.get("/", (req, res) => res.redirect("/view/login.html"));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", msgRoutes);
app.use("/api/users", userRoutes);

// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("Mongo error:", err.message));

// Predefined rooms
const ROOMS = ["devops", "cloud computing", "covid19", "sports", "nodeJS"];

// username -> socket.id mapping (for private chat + typing)
const onlineUsers = new Map();

// Socket logic
io.on("connection", (socket) => {
  // Registers the users after login 
  socket.on("registerUser", ({ username }) => {
    if (!username) return;
    onlineUsers.set(username, socket.id);
    socket.data.username = username;
  });

  // Join room
  socket.on("joinRoom", async ({ username, room }) => {
    try {
      if (!username || !room) return;
      if (!ROOMS.includes(room)) return;

      socket.data.room = room;
      socket.join(room);

      
      const old = await GroupMessage.find({ room })
        .sort({ date_sent: -1 })
        .limit(50);

      socket.emit("roomHistory", old.reverse());
      io.to(room).emit("system", `${username} joined ${room}`);
    } catch (e) {
      console.log("joinRoom error:", e.message);
    }
  });

  // Leave room
  socket.on("leaveRoom", ({ username, room }) => {
    if (!room) return;
    socket.leave(room);
    socket.data.room = null;
    io.to(room).emit("system", `${username || "User"} left ${room}`);
  });

  // Group message
  socket.on("groupMessage", async ({ from_user, room, message }) => {
    try {
      if (!from_user || !room || !message) return;

      const doc = await GroupMessage.create({
        from_user,
        room,
        message,
        date_sent: new Date()
      });

      io.to(room).emit("groupMessage", doc);
    } catch (e) {
      console.log("groupMessage error:", e.message);
    }
  });

  // Room typing indicator
  socket.on("typing", ({ username, room, isTyping }) => {
    if (!username || !room) return;
    socket.to(room).emit("typing", { username, isTyping: !!isTyping });
  });

  //  Private message 
  socket.on("privateMessage", async ({ from_user, to_user, message }) => {
    try {
      if (!from_user || !to_user || !message) return;

      const doc = await PrivateMessage.create({
        from_user,
        to_user,
        message,
        date_sent: new Date()
      });

      // Send back to sender
      socket.emit("privateMessage", doc);

      // Send to receiver if online
      const toSocketId = onlineUsers.get(to_user);
      if (toSocketId) {
        io.to(toSocketId).emit("privateMessage", doc);
      }
    } catch (e) {
      console.log("privateMessage error:", e.message);
    }
  });

  // Private typing indicator (1-to-1)
  socket.on("typingPrivate", ({ from_user, to_user, isTyping }) => {
    if (!from_user || !to_user) return;

    const toSocketId = onlineUsers.get(to_user);
    if (toSocketId) {
      io.to(toSocketId).emit("typingPrivate", {
        from_user,
        isTyping: !!isTyping
      });
    }
  });

  // Cleanup on disconnect
  socket.on("disconnect", () => {
    if (socket.data.username) {
      onlineUsers.delete(socket.data.username);
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
