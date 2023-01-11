import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";

import "./config/mongo.js";

import { VerifyToken, VerifySocketToken } from "./middlewares/VerifyToken.js";
import chatRoomRoutes from "./routes/chatRoom.js";
import chatMessageRoutes from "./routes/chatMessage.js";
import userRoutes from "./routes/user.js";

const app = express();

dotenv.config();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(VerifyToken);

const PORT = process.env.PORT || 8080;

app.use("/api/room", chatRoomRoutes);
app.use("/api/message", chatMessageRoutes);
app.use("/api/user", userRoutes);

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: true,
  },
});

io.use(VerifySocketToken);

global.onlineUsers = new Map();
global.matchingUsers = [];

const getKey = (map, val) => {
  for (let [key, value] of map.entries()) {
    if (value === val) return key;
  }
};

io.on("connection", (socket) => {
  global.chatSocket = socket;

  socket.on("addUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.emit("getUsers", Array.from(onlineUsers));
    console.log("login: " + userId);
  });

  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
    const sendUserSocket = onlineUsers.get(receiverId);
    console.log("msg " + senderId + " to " + receiverId);
    if (sendUserSocket) {
      // if the user is online, send it directly to socket
      socket.to(sendUserSocket).emit("getMessage", {
        senderId,
        message,
      });
      console.log("reciever is live, send it to sockect");
    } else {
      console.log("reciever is not alive no need to send through socket");
    }
  });

  socket.on("disconnect", () => {
    const logoutID = getKey(onlineUsers, socket.id)
    onlineUsers.delete(logoutID);
    socket.emit("getUsers", Array.from(onlineUsers));
    console.log("logout: " + logoutID)
  });

  socket.on("matchUser", ({userId}) => {
    // the java script seems to be one thread, so it should be thread safe
    var matched = false;
    // console.log("recieved matching request");
    // console.log(matchingUsers);
    while (matchingUsers.length > 0 && !matched) {
      const firstUser = matchingUsers.shift();
      if (onlineUsers.has(firstUser)) {
        // this user is waiting for match
        
        if (!onlineUsers.has(userId)) {
          console.log(`user ${userId} is not online!`);
          matchingUsers.push(firstUser);
        } else {
          console.log("match success");
          const matchedUserSocket = onlineUsers.get(firstUser);
          const currentUserSocket = onlineUsers.get(userId);
          if (!matchedUserSocket) {
            console.log("matched user not alive");
          }
          if (!currentUserSocket) {
            console.log("current user not alive");
          }
          socket.to(currentUserSocket).emit("matchedUser", firstUser);
          socket.to(matchedUserSocket).emit("matchedUserCreate", userId);
          matched = true;
        }
      } else {
        console.log(`user ${firstUser} is not online, go next`);
        console.log(onlineUsers);
      }
    }
    if (!matched) {
      console.log("no user matching now, push to list");
      matchingUsers.push(userId);
    }
    // console.log("at the end");
    // console.log(matchingUsers);
  });
});
