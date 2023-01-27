import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";

import "./config/mongo.js";

import { VerifyToken, VerifySocketToken } from "./middlewares/VerifyToken.js";

import { getOneRandomInstruction } from "./service/instruction.js";
import { generateCompletion } from "./service/openAI.js";
import { createChatRoomService, endChatRoomService } from "./service/chatRoom.js";
import { createChatMessageService } from "./service/chatMessage.js";

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
const MATCH_AI = (process.env.MATCH_AI==='true') || false; //default we will not match AI
const AI_UID = process.env.AI_UID || '';
const WAIT_TIME = process.env.WAIT_TIME || 5;

console.log(MATCH_AI);
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
global.userToRoom = new Map();


//this will be used only when there user is matched with AI
global.chatMessage = new Map(); //[{txt: message, sender: int}] 0 for instruction, 1 for user, 2 for AI
global.userToTimer = new Map();

const getKey = (map, val) => {
  for (let [key, value] of map.entries()) {
    if (value === val) return key;
  }
};




io.on("connection", (socket) => {

  const reply_message = async (userId, message='') => {
    try {
      let messages = chatMessage.get(userId);
      const roomId = userToRoom.get(userId);
      if (message !== '') {
        // AI goes first
        messages.push({txt: message, sender: 1});
      }

      //send message back
      const response = await generateCompletion(messages);
      messages.push({txt: response, sender: 2});
      await createChatMessageService(roomId, AI_UID, response);
      const sendUserSocket = onlineUsers.get(userId);
      if ( sendUserSocket ) {
        socket.emit("getMessage", {
          userId: AI_UID,
          message: response
        })
      }
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
    
    

    // set next reply for
    // let newTimer = setTimeout(reply_message(userId, ''), WAIT_TIME * 1000);
    // userToTimer.set(userId, newTimer);
  };

  global.chatSocket = socket;

  socket.on("addUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    userToRoom.set(userId, null); //dont update previous room
    socket.emit("getUsers", Array.from(onlineUsers));
    console.log("login: " + userId);
  });

  socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
    if (receiverId !== AI_UID) {
      // user is communicating with human
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
    } else {
      // TODO: communicate with AI
      // console.log(message);
      let oldTimer = userToTimer.get(senderId);
      clearTimeout(oldTimer);
      const result = await reply_message(senderId, message);
      let newTimer = setTimeout(() => reply_message(senderId, ''), WAIT_TIME*1000);
      userToTimer.set(senderId, newTimer);
    }
  });

  socket.on("disconnect", () => {
    const logoutID = getKey(onlineUsers, socket.id);
    onlineUsers.delete(logoutID);
    socket.emit("getUsers", Array.from(onlineUsers));

    let oldTimer = userToTimer.get(logoutID);
    if ( oldTimer ) {
      clearTimeout(oldTimer);
      userToTimer.delete(logoutID);
    }
    //close user's chatroom
    const roomId = userToRoom.get(logoutID);
    if (roomId !== null) {
      endChatRoomService(roomId, true);
    }
    console.log("logout: " + logoutID)
  });

  socket.on("matchUser", async ({userId}) => {
    if (!MATCH_AI) {
      // the java script seems to be one thread, so it should be thread safe
      var matched = false;
      // we will match human for user, behavior will be normal
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
            console.log(`two sockets: ${currentUserSocket} ${matchedUserSocket}`);
            
            // create chat room manually
            var insText;
            const oneInstruction = await getOneRandomInstruction();
            if (oneInstruction !== null) {
              insText = oneInstruction.text;
            } else {
              insText = "there is no instruction in databse!";
            }
            const newChatRoom = await createChatRoomService([userId,firstUser], insText);

            // auto send ready to user after several seconds

            // let timer = setTimeout(() => {
            //   socket.emit("userReady", {senderId: AI_UID})
            // }, WAIT_TIME*1000);
            // userToTimer.set(userId, timer);

            if (newChatRoom !== null) {
              socket.emit("matchedUser", newChatRoom);
              socket.to(matchedUserSocket).emit("matchedUser", newChatRoom);
              matched = true;
            }
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
    } else {
      // TODO:we can directly match AI with user
      // create a chat room for user'
      var insText;
      const oneInstruction = await getOneRandomInstruction();
      if (oneInstruction !== null) {
        insText = oneInstruction.text;
      } else {
        insText = "there is no instruction in databse!";
      }

      const newChatRoom = await createChatRoomService([userId, AI_UID], insText);
      if (newChatRoom !== null) {
        socket.emit("matchedUser", newChatRoom);
        chatMessage.set(userId, [{txt: insText, sender: 0}]);
      }
      
    }
  });

  socket.on("ready", async({chatRoom, userId}) => {
    if (MATCH_AI) {
      socket.emit("userReady", {senderId: AI_UID});
      let newTimer = setTimeout(() => reply_message(userId, ''), WAIT_TIME * 1000);
      userToTimer.set(userId, newTimer);
    } else {
      let otherUser = chatRoom.members[0];
      if (otherUser === userId) {
        otherUser = chatRoom.members[1];
      }
      console.log(`${userId} ready, send to ${otherUser}`)
      const toSocket = onlineUsers.get(otherUser);
      socket.to(toSocket).emit("userReady", {senderId: userId});
    }

  })
});
