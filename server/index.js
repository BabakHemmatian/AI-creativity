import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";

import "./config/mongo.js";

import { VerifyToken, VerifySocketToken } from "./middlewares/VerifyToken.js";

import { getOneRandomInstruction } from "./service/instruction.js";
import { generateCompletion } from "./service/openAI.js";
import { createChatRoomService, endChatRoomService, createRandomChatRoomListService, appendChatRoomService, createChatRoomListService} from "./service/chatRoom.js";
import { createChatMessageService } from "./service/chatMessage.js";
import { chatgptReply } from "./service/openAI.js";

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
// const AI_VERSION = process.env.AI_VERSION || "GPT-3.5";
const CONS_LIST = process.env.CONS_LIST;
const WAIT_TIME_DIFF = process.env.WAIT_TIME_DIFF || 2;
const reply_list = CONS_LIST.split(",")
const NON_REPLY_PROMPT = process.env.NON_REPLY_PROMPT;

var lastOder = -1;
const ORDERS = [
  [['HUM','CON','GPT'],['HUM','GPT','CON']],
  [['HUM','CON','GPT'],['HUM','CON','GPT']],
  [['HUM','GPT','CON'],['HUM','GPT','CON']],
  [['HUM','GPT','CON'],['HUM','CON','GPT']],

  [['CON','HUM','GPT'],['GPT','HUM','CON']],
  [['CON','HUM','GPT'],['CON','HUM','GPT']],
  [['GPT','HUM','CON'],['GPT','HUM','CON']],
  [['GPT','HUM','CON'],['CON','HUM','GPT']],
  
  [['CON','GPT','HUM'],['GPT','CON','HUM']],
  [['CON','GPT','HUM'],['CON','GPT','HUM']],
  [['GPT','CON','HUM'],['GPT','CON','HUM']],
  [['GPT','CON','HUM'],['CON','GPT','HUM']]
]

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
global.chatMessage = new Map(); //[{text: message, sender: int}] 0 for instruction, 1 for user, 2 for AI
// global.userToTimer = new Map();
global.userToRes = new Map();
global.userToTypes = new Map();
global.userToList = new Map();

const getKey = (map, val) => {
  for (let [key, value] of map.entries()) {
    if (value === val) return key;
  }
};

const randSubAdd = () => {
  const randNum = Math.floor(Math.random() * WAIT_TIME_DIFF * 2);
  return randNum - WAIT_TIME;
}

const getRandomOrders = () => {
  if (lastOder === -1) {
    const index = Math.floor(Math.random() * 24);
    const i = Math.round(index/2)
    const j = Math.round(index%2)
    lastOder = index;
    return ORDERS[i][j]
  } else {
    const i = Math.round(lastOder/2)
    const j = Math.round(lastOder%2)
    lastOder = -1;
    if (j === 0) {
      return ORDERS[i][1];
    } else {
      return ORDERS[i][0];
    }
  }
  
}


io.on("connection", (socket) => {

  const reply_message = async (userId) => {
    try {
      // console.log(AI_VERSION);
      let messages = chatMessage.get(userId);
      const roomId = userToRoom.get(userId);
      const types = userToTypes.get(userId);

      if (!types) {
        console.log(`reply message: no types for user ${userId}`);
      } else if (types.length==0) {
        console.log(`reply message: types length is 0 for ${userId}`);
      }
      const curType = types[0];
      // const curType = 
      let response = null;
      if (curType==="CHT") {
        const userMessage = messages.filter(m => m.sender === 1);
        const aiMessage = messages.filter(m => m.sender === 2);
        const res = userToRes.get(userId);
        if (aiMessage.length === 0) {
          // the first message of ai should always consider the idea
          console.log(messages);
          response = await chatgptReply(messages[0], messages, res);
          userToRes.set(userId, response);
        } else if (userMessage.length === 0) {
          // console.log(userMessage[userMessage.length-1]);
          response = await chatgptReply({text: NON_REPLY_PROMPT, replied: true}, messages, res)
          userToRes.set(userId, response);
        } else {
          response = await chatgptReply(userMessage[userMessage.length-1], messages,res)
          userToRes.set(userId, response);
        }
        messages.push({text: response.text, sender: 2, replied: true});
      } else if (curType === "GPT") {
        response = await generateCompletion(messages);
        messages.push({text: response.text, sender: 2, replied: true});
      } else {
        //TODO: reply constant
        const userMessage = messages.filter(m => m.sender === 2);
        const index = userMessage.length;
        if (index >= reply_list.length) {
          // the list of reply is not enough
          console.log("list reply not enough");
        }
        response = {text: reply_list[index % reply_list.length]};
        messages.push({text: response.text, sender: 2, replied: true});
        
      }
      // console.log(response.text);
      // console.log(response);
      if (response.text.length > 0) {
        await createChatMessageService(roomId, AI_UID, response.text);
        const sendUserSocket = onlineUsers.get(userId);
        if ( sendUserSocket ) {
          socket.emit("getMessage", {
            userId: AI_UID,
            message: response.text
          })
        }
      }
      return true;
      
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  global.chatSocket = socket;

  socket.on("addUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    userToRoom.set(userId, undefined); // dont update previous room
    userToTypes.set(userId, []);
    socket.emit("getUsers", Array.from(onlineUsers));
    console.log("login: " + userId);
  });

  socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
    const roomId = userToRoom.get(senderId);
    if (!roomId) {
      console.log(`sendMessage: roomId not found for ${senderId}`);
    }
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
      // we can just push user's message and let AI response with that messages
      const messages = chatMessage.get(senderId);
      if (messages !== null) {
        messages.push({text: message.trim(), sender: 1, replied: false});
      }
      
    }
    createChatMessageService(roomId, senderId, message.trim());
  });

  socket.on("disconnect", () => {
    const logoutID = getKey(onlineUsers, socket.id);
    onlineUsers.delete(logoutID);
    socket.emit("getUsers", Array.from(onlineUsers));

    // const roomId = userToRoom.get(logoutID);
    // if (roomId !== null && roomId !== undefined) {
    //   endChatRoomService(roomId, true);
    //   userToRoom.delete(logoutID);
    // }
    try {
      const roomId = userToRoom.get(logoutID);
      endChatRoomService(roomId, true);
      userToRoom.delete(logoutID);
      userToList.delete(logoutID);
      userToTypes.set(logoutID, []);
    } catch (error) {
      console.log(error);
    }

    // const index = userToIndex.get(logoutID);
    // if (index !== null) {
    //   userToIndex.delete(logoutID);
    // }

    console.log("logout: " + logoutID)
  });

  socket.on("matchUser", async ({userId}) => {
    const types = userToTypes.get(userId);
    if (types.length == 0) {
      //1. If current user does not have an order, create one and create the first chat room
      //const typeList = await createRandomChatRoomListService(userId);
      const newOrder = getRandomOrders();
      console.log("create new order list");
      console.log(newOrder);
      const typeList = await createChatRoomListService(userId, newOrder);
      userToList.set(userId, typeList._id.toString());
      typeList.chatTypes.forEach(e => {
        types.push(e);
      });
      console.log(`create three types for ${userId}`);
      console.log(types);
    }

    const curType = types[0];
    const curI = 3-types.length;
    console.log(`curI: ${curI}`);
    const curList = userToList.get(userId);
    if (curType=="HUM") {
      // match with human
      var matched = false;
      // we will match human for user, behavior will be normal
      while (matchingUsers.length > 0 && !matched) {
        const firstUser = matchingUsers.shift();
        const firstTypes = userToTypes.get(firstUser);
        const firstI = 3-firstTypes.length;
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
            const newChatRoom = await createChatRoomService([userId,firstUser], insText, curType, curList);
            await appendChatRoomService(newChatRoom._id, curList);
            userToRoom.set(userId, newChatRoom._id.toString());
            userToRoom.set(firstUser, newChatRoom._id.toString());
            if (newChatRoom !== null) {
              socket.emit("matchedUser", {data:newChatRoom, index:curI});
              socket.to(matchedUserSocket).emit("matchedUser", {data:newChatRoom, index:firstI});   
            } else {
              console.log("chatroom create failed");
            }
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
    } else {
      // match with AI
      var insText;
      const oneInstruction = await getOneRandomInstruction();
      if (oneInstruction !== null) {
        insText = oneInstruction.text
      } else {
        insText = "there is no instruction in databse!";
      }

      const newChatRoom = await createChatRoomService([userId, AI_UID], insText, curType, curList);
      await appendChatRoomService(newChatRoom._id, curList);
      if (newChatRoom !== null) {
        socket.emit("matchedUser", {data:newChatRoom, index:curI});
        chatMessage.set(userId, [{text: insText, sender: 0, replied: true}]);
        userToRoom.set(userId, newChatRoom._id.toString());
        // userToIndex.set(userId, 0); //start with zero one,
      }
    }
  });

  socket.on("ready", async({chatRoom, userId}) => {
    const curType = chatRoom.chatType;
    // console.log(`ready: ${curType}`);
    if (curType !=='HUM') {
      // console.log("ready: AI");
      // await new Promise(r => setTimeout(r, 2000));
      socket.emit("userReady", {senderId: AI_UID});
      setTimeout(async function chat() {
        const roomId = userToRoom.get(userId);
        if (roomId !== null && roomId !== undefined) {
          // check if the room has ended
          await reply_message(userId);

          // chat is still alive, set next timer for reply
          // const timeDiff = ;
          setTimeout(chat, (WAIT_TIME-randSubAdd())*1000);
        }
      }, (WAIT_TIME-randSubAdd())*1000);
    } else {
      // console.log("ready: human")
      let otherUser = chatRoom.members[0];
      if (otherUser === userId) {
        otherUser = chatRoom.members[1];
      }
      console.log(`${userId} ready, send to ${otherUser}`)
      const toSocket = onlineUsers.get(otherUser);
      socket.to(toSocket).emit("userReady", {senderId: userId});
    }

  })

  socket.on("timeout", async({roomId, userId}) => {
    //time is running out, the chat room ends normally
    const mapRoomId = userToRoom.get(userId);
    const types = userToTypes.get(userId);
    if (!types) {
      console.log(`timeout: no types for user ${userId}`);
    } else if (types.length==0) {
      console.log(`timeout: types length is 0 for ${userId}`);
    } else {
      types.shift();
      userToTypes.set(userId, types);
    }
    
    //normally end the chat room
    endChatRoomService(roomId, false);
    if (roomId === mapRoomId) {
      // everything good, end the chat room
      userToRoom.delete(userId);
      // endChatRoomService(roomId, false);
    } else {
      console.log("roomId is not equal to mapped roomId!");
      console.log(roomId);
      console.log(mapRoomId)
    }
  })

  socket.on("ping", async({userId}) => {
    console.log('pong');
    const sendUserSocket = onlineUsers.get(userId);
    if (sendUserSocket !== undefined) {
      socket.to(sendUserSocket).emit('pong');
    }
  })
});
