// ================= IMPORTS =================

// React hooks
import { useState, useEffect, useRef } from "react";

// Socket.IO client for realtime communication
import io from "socket.io-client";

// CSS file
import "./App.css";

// Emoji picker component
import EmojiPicker from "emoji-picker-react";


// ================= SOCKET CONNECTION =================

// Connect frontend with backend server
const socket = io("http://localhost:5000");


function App() {

  // ================= STATE VARIABLES =================

  const [username, setUsername] = useState("");   // Logged-in username
  const [room, setRoom] = useState("");           // Room ID
  const [joined, setJoined] = useState(false);    // Join status

  const [message, setMessage] = useState("");     // Current input message
  const [chat, setChat] = useState([]);           // All chat messages

  const [darkMode, setDarkMode] = useState(false);   // Dark mode toggle
  const [showEmoji, setShowEmoji] = useState(false); // Emoji picker visibility

  const [onlineUsers, setOnlineUsers] = useState(1); // Online users count
  const [typingUser, setTypingUser] = useState("");  // Who is typing

  const chatEndRef = useRef(null);        // Auto scroll reference
  const typingTimeoutRef = useRef(null);  // Typing timeout reference



  // ================= JOIN CHAT =================

  const joinChat = () => {

    // Prevent empty username or room
    if (username.trim() && room.trim()) {

      setJoined(true);

      // Join private room on server
      socket.emit("join_room", room);
    }
  };



  // ================= LOGOUT =================

  const logout = () => {

    setJoined(false);
    setUsername("");
    setRoom("");
    setChat([]);
  };



  // ================= SEND MESSAGE =================

  const sendMessage = () => {

    if (!message.trim()) return;

    // Message object
    const msgData = {
      id: Date.now(),                 // Unique message ID
      room,
      username,
      message,
      time: new Date().toLocaleTimeString(),
      status: "sent",

      // Default reaction counts
      reactions: {
        like: 0,
        love: 0,
        fire: 0
      }
    };

    // Send to backend
    socket.emit("send_message", msgData);

    // Clear input
    setMessage("");
  };



  // ================= REACTIONS =================

  const addReaction = (msgId, type) => {

    // Update reaction count locally
    setChat(prev =>
      prev.map(msg =>
        msg.id === msgId
          ? {
            ...msg,
            reactions: {
              ...msg.reactions,
              [type]: (msg.reactions?.[type] || 0) + 1
            }
          }
          : msg
      )
    );
  };



  // ================= EMOJI CLICK =================

  const onEmojiClick = (emojiData) => {

    // Append emoji to message input
    setMessage(prev => prev + emojiData.emoji);
  };



  // ================= TYPING EVENT =================

  const handleTyping = () => {

    if (!joined || !username || !room) return;

    socket.emit("typing", {
      username,
      room
    });
  };



  // ================= SOCKET LISTENERS =================

  useEffect(() => {

    // ---------- Receive Messages ----------

    const receiveHandler = (data) => {

      setChat(prev => [
        ...prev,
        {
          ...data,
          self: data.username === username,
          reactions: data.reactions || {
            like: 0,
            love: 0,
            fire: 0
          }
        }
      ]);

      // Auto scroll to latest message
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };

    socket.on("receive_message", receiveHandler);


    // ---------- Online Users ----------

    socket.on("online_users", setOnlineUsers);


    // ---------- Typing Indicator ----------

    socket.on("typing", (user) => {

      if (!user) return;

      setTypingUser(user);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Hide typing after 1.5 seconds
      typingTimeoutRef.current = setTimeout(() => {
        setTypingUser("");
      }, 1500);
    });


    // ---------- Cleanup ----------

    return () => {
      socket.off("receive_message", receiveHandler);
      socket.off("online_users");
      socket.off("typing");
    };

  }, [username]);



  // ================= JOIN SCREEN =================

  if (!joined) {
    return (
      <div className="join-container">

        <div className="join-box">

          <h2>💬 Join Chat</h2>

          {/* Username Input */}
          <input
            placeholder="Enter your name..."
            onChange={(e) => setUsername(e.target.value)}
          />

          {/* Room Input */}
          <input
            placeholder="Enter room ID..."
            onChange={(e) => setRoom(e.target.value)}
          />

          {/* Join Button */}
          <button onClick={joinChat}>
            Join
          </button>

        </div>

      </div>
    );
  }



  // ================= CHAT SCREEN =================

  return (
    <div className={`chat-fullscreen ${darkMode ? "dark" : ""}`}>

      {/* HEADER */}
      <div className="chat-header">
        Room: {room}
        <span className="online">🟢 {onlineUsers}</span>
      </div>



      {/* USER CONTROLS */}
      <div className="user-controls">

        👤 {username}

        {/* Dark mode toggle */}
        <button onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "☀️" : "🌙"}
        </button>

        {/* Logout */}
        <button onClick={logout}>
          Logout
        </button>

      </div>



      {/* CHAT BOX */}
      <div className="chat-box">

        {chat.map(msg => (

          <div
            key={msg.id}
            className={`message ${msg.self ? "my-message" : "other-message"}`}
          >

            {/* Username */}
            <b>{msg.username}</b>

            {/* Message Text */}
            <div>{msg.message}</div>

            {/* Time */}
            <div className="time">{msg.time}</div>

            {/* Delivery Status */}
            {msg.self && (
              <div className="status">✔✔</div>
            )}

            {/* Reactions */}
            <div className="reactions">

              <span onClick={() => addReaction(msg.id, "like")}>
                👍 {msg.reactions.like}
              </span>

              <span onClick={() => addReaction(msg.id, "love")}>
                ❤️ {msg.reactions.love}
              </span>

              <span onClick={() => addReaction(msg.id, "fire")}>
                🔥 {msg.reactions.fire}
              </span>

            </div>

          </div>
        ))}


        {/* Typing Indicator */}
        {typingUser && typingUser !== username && (
          <div className="typing-text">
            ✏️ {typingUser} is typing...
          </div>
        )}

        {/* Auto Scroll Anchor */}
        <div ref={chatEndRef}></div>

      </div>



      {/* EMOJI PICKER */}
      {showEmoji && (
        <div className="emoji-picker">
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </div>
      )}



      {/* INPUT AREA */}
      <div className="chat-input">

        {/* Emoji Button */}
        <button onClick={() => setShowEmoji(!showEmoji)}>
          😀
        </button>

        {/* Message Input */}
        <input
          type="text"
          placeholder="Type message..."
          value={message}

          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}

          onKeyDown={(e) =>
            e.key === "Enter" && sendMessage()
          }
        />

        {/* Send Button */}
        <button onClick={sendMessage}>
          Send
        </button>

      </div>

    </div>
  );
}


// Export component
export default App;