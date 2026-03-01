// ======================================================
// 1. IMPORT REQUIRED MODULES
// ======================================================

// Express framework (web server)
const express = require("express");

// HTTP server (needed for Socket.IO)
const http = require("http");

// Socket.IO server
const { Server } = require("socket.io");

// CORS middleware (allow frontend connection)
const cors = require("cors");


// ======================================================
// 2. CREATE EXPRESS APP
// ======================================================

const app = express();

// Enable CORS
app.use(cors());

// Create HTTP server using Express app
const server = http.createServer(app);


// ======================================================
// 3. CREATE SOCKET.IO SERVER
// ======================================================

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",   // Frontend URL
        methods: ["GET", "POST"],
    },
});


// ======================================================
// 4. GLOBAL VARIABLES
// ======================================================

// Track number of online users
let onlineUsers = 0;


// ======================================================
// 5. SOCKET CONNECTION EVENT
// ======================================================

io.on("connection", (socket) => {

    console.log("User Connected:", socket.id);


    // --------------------------------------------------
    // 5.1 UPDATE ONLINE USERS COUNT
    // --------------------------------------------------

    onlineUsers++;
    io.emit("online_users", onlineUsers);


    // --------------------------------------------------
    // 5.2 JOIN ROOM EVENT
    // --------------------------------------------------

    socket.on("join_room", (room) => {

        socket.join(room);

        console.log(`User ${socket.id} joined room ${room}`);

    });


    // --------------------------------------------------
    // 5.3 SEND MESSAGE EVENT
    // --------------------------------------------------

    socket.on("send_message", (data) => {

        console.log("Message:", data);

        // Add delivery status
        const messageData = {
            ...data,
            status: "sent"
        };

        // If private room exists → send inside room
        if (data.room) {

            // Send to others in room
            socket.to(data.room).emit("receive_message", messageData);

            // Send back to sender
            socket.emit("receive_message", messageData);

        } else {

            // Global broadcast fallback
            io.emit("receive_message", messageData);

        }

    });


    // --------------------------------------------------
    // 5.4 TYPING INDICATOR EVENT
    // --------------------------------------------------

    socket.on("typing", (data) => {

        console.log("Typing Data:", data);

        if (!data) return;

        const { username, room } = data;

        // Send typing only inside same room
        if (room && username) {

            socket.to(room).emit("typing", username);

        }

    });


    // --------------------------------------------------
    // 5.5 MESSAGE SEEN EVENT
    // --------------------------------------------------

    socket.on("message_seen", (msgId) => {

        // Broadcast seen update to all users
        io.emit("message_seen_update", msgId);

    });


    // --------------------------------------------------
    // 5.6 DISCONNECT EVENT
    // --------------------------------------------------

    socket.on("disconnect", () => {

        console.log("User Disconnected:", socket.id);

        onlineUsers--;

        io.emit("online_users", onlineUsers);

    });

});


// ======================================================
// 6. START SERVER
// ======================================================

server.listen(5000, () => {
    console.log("Server running on port 5000");
});