import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";

import "./config/mongo.js";

import { VerifyToken, VerifySocketToken } from "./middlewares/VerifyToken.js";

import { getOneRandomInstruction } from "./service/instruction.js";
import { generateCompletion } from "./service/openAI.js";
import { generateConReply } from "./service/constantReply.js";
import { createChatRoomService, endChatRoomService, createRandomChatRoomListService, appendChatRoomService, createChatRoomListService} from "./service/chatRoom.js";
import { createChatMessageService } from "./service/chatMessage.js";
import { chatgptReply } from "./service/openAI.js";
import { print_log } from "./service/utils.js";
import { constResponses } from "./config/constResponse.js";
import chatRoomRoutes from "./routes/chatRoom.js";
import chatMessageRoutes from "./routes/chatMessage.js";
import userRoutes from "./routes/user.js";
const app = express();

dotenv.config();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(VerifyToken);

/** load neccessary const variablle */ 
const PORT = process.env.PORT || 8080;
const AI_UID = process.env.AI_UID || '';
const WAIT_TIME = process.env.WAIT_TIME || 5;
// const WAIT_TIME = 5;
const ITEMS = process.env.ITEMS.split(',');
const CONS_LIST = process.env.CONS_LIST;
const WAIT_TIME_DIFF = process.env.WAIT_TIME_DIFF || 2;
const reply_list = CONS_LIST.split(",")
const NON_REPLY_PROMPT = process.env.NON_REPLY_PROMPT;
const SESSION_TIME = process.env.SESSION_TIME || 120;
const MATCH_CONDITION = process.env.MATCH_CONDITION || 'ALL'

/** maps needed for functioning */
global.onlineUsers = new Map();
// global.matchingUsers = [];
global.userToRoom = new Map();
//this will be used only when there user is matched with AI
global.chatMessage = new Map(); //[{text: message, sender: int}] 0 for instruction, 1 for user, 2 for AI
global.userToRes = new Map();
global.userToTypes = new Map();
global.userToList = new Map();
// global.matchesUser = new Map(); //set two user together
// global.matchingUsers = new Set();
global.userSession = new Map();
global.recoverUser = new Set();



const DEFAULT_SESSION = {
  ended: true,
  isMatching: false,
  types: [],
  items: [],
  currentI: -1,
  matchedUser: null,
  currentList: null,
  currentChatRoom: null,
  disconnecttime: new Date()
}

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

const ITEMINDEX = [
  [1,2,0],
  [1,0,2],
  [2,1,0],
  [2,0,1],
  [0,1,2],
  [0,2,1],
]

var lastOder = -1;
var lastItem = -1;
var lastUser = '';


// print_log(MATCH_AI);
app.use("/api/room", chatRoomRoutes);
app.use("/api/message", chatMessageRoutes);
app.use("/api/user", userRoutes);

const server = app.listen(PORT, () => {
  print_log(`Server listening on port ${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: true,
  },
});

io.use(VerifySocketToken);

// console.log('test start');
// const dummyMessages = [
//   {text:"build a children's house", sender:2, replied:true},
//   {text:"to make music, can be used as a drum", sender:2, replied:true},
//   {text:"used in place of a cutting board when slicing vegetables or meat", sender:2, replied:true},
//   {text:"ruler",sender:2},
//   {text:"to eat",sender:2},
//   {text:"brick",sender:2},
//   {text:"cat bed",sender:2},
//   {text:"absorb spilled liquid",sender:2},
//   {text:"to send secret message",sender:2},
//   {text:"to make music, can be used as a drum",sender:2},
//   {text:"table tennis pool",sender:2},
//   {text:"help with balance when doing yoga",sender:2},
//   {text:"Make a book into a clock by attaching clock hands to the cover",sender:2},
//   {text:"handkerchief",sender:2},
//   {text:"sex toy",sender:2},
//   {text:"Make a purse out of an old book",sender:2},
//   {text:"used in place of a cutting board when slicing vegetables or meat",sender:2}
// ]
// const re = generateConReply(dummyMessages, 'high', 'book');
// console.assert(re === "juggling")
// console.log('test end');

const getKey = (map, val) => {
  for (let [key, value] of map.entries()) {
    if (value === val) return key;
  }
};


const randSubAdd = () => { //wait_time_diff = 1
  const randNum = Math.floor(Math.random() * WAIT_TIME_DIFF * (-5)); // 
  return randNum - WAIT_TIME; //wait_time = 5 ==> -10,-5
} 


const getRandomOrders = () => {
  if (lastOder === -1) {
    /** switch from test to online */
    const index = 8 // uncomment for testing
    // const index = Math.floor(Math.random() * 12);

    lastOder = index;
    return ORDERS[index][0]
  } else {
    const index = lastOder;
    lastOder = -1;
    return ORDERS[index][1]
  }
}

const getRandomItems = () => {
  const items = []
  if (lastItem === -1) {
    /** switch from test to online */
    // const index = 6 // uncomment for testing
    const index = Math.floor(Math.random() * 6);
    lastItem = index;
    ITEMINDEX[index].forEach(i => {
      items.push(ITEMS[i]);
    })
    // matchesUser.set()
    return items;
  } else {
    const index = lastItem;
    lastItem = -1
    ITEMINDEX[index].forEach(i => {
      items.push(ITEMS[i]);
    })
    return items;
  }
}

const getOneRandomItem = () => {
  const items = [];

  if (MATCH_CONDITION === 'HUM') {
    if (lastItem === -1) {
      /** switch from test to online */
      // const index = 6 // uncomment for testing
      const index = Math.floor(Math.random() * 3);
      lastItem = index;
      items.push(ITEMS[index]);
      return items;
    } else {
      const index = lastItem;
      lastItem = -1
      items.push(ITEMS[index]);
      return items;
    }
  } else {
    const index = Math.floor(Math.random() * 3);
    items.push(ITEMS[index]);
    return items;
  }

}

let not_ai_replied_first = false;

io.on("connection", (socket) => {

  const reply_message = async (userId) => { //CHANGED THIS
    const session = userSession.get(userId); //usersession is a map
    const room = session.currentChatRoom; //room is a chatroom object
    if (session && room) { //if session and room are not null or undefined
      try {
        const roomId = room._id.toString(); //room id is a string
        let messages = chatMessage.get(userId); //messages is an array
        const types = session.types; //types is an array
        const items = session.items;  //items is an array
        if (!types) {
          print_log(`reply message: no types for user ${userId}`, -1)
        } else if (types.length === 0) {
          print_log(`reply message: types length is 0 for ${userId}`, -1);
        }
        if (!items) {
          print_log(`reply message: no items for user ${userId}`, -1)
        } else if (types.length === 0) {
          print_log(`reply message: items length is 0 for ${userId}`, -1);
        }
        const curI = session.currentI;
        const curType = types[curI];
        const curItem = items[curI];
        //print_log(`reply_message : session.conMes: ${session.conMes}`);
        print_log(`reply_message: start reply for ${userId}, current (Index,type): ${session.currentI},${curType}`, 1);
        let response = null;
        if (curType==="CHT") { //if current type is chat
          const userMessage = messages.filter(m => m.sender === 1); //usermessage is an array
          const aiMessage = messages.filter(m => m.sender === 2); //aimessage is an array
          const res = userToRes.get(userId); //res is a string
          if (aiMessage.length === 0) {
            // the first message of ai should always consider the idea
            print_log(messages, 1);
            response = await chatgptReply(messages[0], messages, res); 
            userToRes.set(userId, response); 
          } else if (userMessage.length === 0) {
            // print_log(userMessage[userMessage.length-1]);
            response = await chatgptReply({text: NON_REPLY_PROMPT, replied: true}, messages, res)
            userToRes.set(userId, response);
          } else {
            response = await chatgptReply(userMessage[userMessage.length-1], messages,res)
            userToRes.set(userId, response);
          }
          messages.push({text: response.text, sender: 2, replied: true});
        } else if (curType === "GPT") { 
          //CHANGED THIS
          
          if (!not_ai_replied_first) //if first response is from AI
          {
            response = await generateCompletion(messages,not_ai_replied_first); 
            messages.push({text: response.text, sender: 2, replied: true});
          }
          
          else //not first response from AI
          {
            if (messages && messages.length > 0)
            {
              const recent_message = messages[messages.length - 1]
              if (recent_message.sender === 1) //if user sent sth
              {
                response = await generateCompletion(messages,not_ai_replied_first); //then only generate
                messages.push({text: response.text, sender: 2, replied: true});
              }
            }
          }

          not_ai_replied_first = true;

        } else {
          /** constant reply */

          //console.log("generateConReply:  messages", messages, "conMes", session.conMes, 1);
          response = await generateConReply(messages, session.conMes);
          messages.push({text: response, sender: 2, replied: true});
        }
        // print_log(response.text);
        // print_log(response);
        if (response) // if response exists
        {
          if (response.text.length > 0) {
            await createChatMessageService(roomId, AI_UID, response.text);
            const sendUserSocket = onlineUsers.get(userId);
            if ( sendUserSocket ) {
              print_log(`reply_message: send response to socket`, 1)
              socket.emit("getMessage", {
                senderId: AI_UID,
                message: response.text,
                roomId: roomId
              })
            } else {
              print_log(`reply_message: sendUserSocket is null or undefined, user ${userId}`, -1);
            }
          } else {
            print_log(`reply_message: response is empty`, -1)
          }
        }
        return true;
        
      } catch (error) {
        print_log(`reply message: throw an error`, -1);
        print_log(error, -1);
        return false;
      }
    } else {
      /** possible happened during test */
      if (!session) {
        print_log(`reply_message session for ${userId} is null or undefined`, -1);
      }
      if (!room) {
        print_log(`reply_message room for ${userId} is null or undefined`, -1);
      }
    }
    
  };

  // global.chatSocket = socket;

// {
//   TYPES: Array,
//   ITEMS: Array,
//   CURRENTI: Number,
//   MATCHUSER: String,
//   ENDTIME: timestamp
// }

  socket.on("addUser", async (userId) => {
    //TODO: check whether current user has unfinished session

    
    if (!userSession.has(userId)) {
      /** current user is the first time visiting */
      print_log(`userId ${userId} not in userSession`);
      const newsession = {...DEFAULT_SESSION};
      userSession.set(userId, newsession);
    }
    const curTime = new Date();
    const cursession = userSession.get(userId);
    const timediff = (curTime.getTime() - cursession.disconnecttime.getTime()) / 1000;
    print_log(`time diff ${timediff} seconds`, 4);
    print_log(cursession.disconnecttime, 4);
    if (!cursession.ended && timediff < SESSION_TIME) {
      /** last session has not ended and it has not timeout yet */
      print_log("recover session", 4);
      socket.emit("getSession", {isRecover: true, session: cursession});
    } else if (!cursession.ended) {
      // if (newsession.matchedUser !== null) {
      //   const matchedsession = userSession.get(newsession.matchedUser);

      //   print_log("someuser are still waiting for");
      //   /** we need to setboth */
      // }
      /** last session has not ended, but it has timeout */
      print_log("session time out, start new", 4);
      const newsession = {...DEFAULT_SESSION};
      userSession.set(userId, newsession);
      socket.emit("getSession", {isRecover: false, session: newsession});
    } else {
      /** last session has ended, start new */
      print_log("previous session ended, start new", 4)
      socket.emit("getSession", {isRecover: false, session: cursession});
    }
    
    onlineUsers.set(userId, socket.id);
    print_log(`login: ${userId}`, 4);
  });

  socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
    const session = userSession.get(senderId);
    const room = session.currentChatRoom;
    if (!room) {
      print_log(`sendMessage: room is undefined or null for ${senderId}`);
    }
    const roomId = room._id.toString();
    if (receiverId !== AI_UID) {
      // user is communicating with human
      const sendUserSocket = onlineUsers.get(receiverId);
      print_log(`sendMessage: ${senderId} to ${receiverId}`, 3);
      if (sendUserSocket) {
        // if the user is online, send it directly to socket
        socket.to(sendUserSocket).emit("getMessage", {
          senderId,
          message,
          roomId,
        });
        print_log("sendMessage: reciever is live, send it to sockect", 3);
      } else {
        print_log("sendMessage: reciever is not alive no need to send through socket", 3);
      }
    } else {
      // TODO: communicate with AI
      // print_log(message);
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
    const session = userSession.get(logoutID);
    const logoutTime = new Date();
    onlineUsers.delete(logoutID);
    // socket.emit("getUsers", Array.from(onlineUsers));

    print_log(`logout: ${logoutID} ${logoutTime}`, 4);
    try {
      if (session) {
        if (recoverUser.has(logoutID)) {
          /** that is reconnection for paired user */
          recoverUser.delete(logoutID);
        } else {
          /** that is reconnection for first time */
          // const session = userSession.get(logoutID);
        
          print_log(`current session end: ${session.ended}`, 4);
          if (!session.ended) {
            /** there is unexpected disconnection */
            if (session.matchedUser !== undefined && session.matchedUser !== null ) {
              /** has matched user */
              const matchedsession = userSession.get(session.matchedUser);
              const matchedroom = matchedsession.currentChatRoom
              const matchedUserSocket = onlineUsers.get(session.matchedUser);
              if (matchedroom !== null && matchedroom.chatType === 'HUM') {
                /** they are chatting, need to inform matched user */
                socket.to(matchedUserSocket).emit("refresh");
                recoverUser.add(session.matchedUser);
              }
            }
          }
        }
        userSession.set(logoutID, {...session, ...{disconnecttime: logoutTime}});
      }

    } catch (error) {
      print_log("disconnect: throws an error")
      print_log(error);
    }
    
  });

  socket.on("matchUser", async ({userId}) => {
    let session = userSession.get(userId);
    print_log(`matchUser: for ${userId}`, 5);
    if (session.ended) {
      /** we need a new session */
      if (MATCH_CONDITION === 'ALL') {
        /** three chatroom in one session */
        const newOrder = getRandomOrders();
        const newItems = getRandomItems(userId);
        session = userSession.get(userId);
        print_log("matchUser: previous session is ended, create new one", 5);
        print_log(newOrder, 5);
        print_log(newItems, 5);
        
        
        //SET FOR HUMAN - NEED TO MOVE THIS
        if (lastUser !== '' && lastUser !== userId) 
        {
          /** matched user */
          const lastsession = userSession.get(lastUser);
          session = {...session, ...{matchedUser: lastUser}};
          userSession.set(userId, session);
          userSession.set(lastUser, {...lastsession, ...{matchedUser: userId}});
          print_log(`matchUser: ${userId} matched to ${lastUser}`, 5);
          lastUser = '';
        } else {
          lastUser = userId;
        }

        const typeList = await createChatRoomListService(userId, newOrder);
        session = {...session, ...{ended: false,  types: newOrder, items: newItems, currentI: 0, currentList: typeList._id}};

        //print_log(`matchUser: currentchatroom.types ${chatRoom.chatType}`, 5);
          

      //   if (session.types[session.currentI] === 'CON') 
      //   {
          
      //     /** randomly assign user high or low quality response */
      //     if (Math.random() >= 0.66) 
      //     {
      //       session = {...session, ...{quality: 'high'}};
      //     } 
      //     else if (Math.random() >= 0.33) 
      //     {
      //       session = {...session, ...{quality: 'gpt'}};
      //     } 
      //     else 
      //     {
      //       session = {...session, ...{quality: 'low'}};
      //     }
      //   //TODO: get shuffle messages
      //   const curItem = newItems[0];
      //   //print_log(`matchUser: curItem: ${curItem}, quality: ${session.quality}`);
      //   const curResponse = constResponses[curItem][session.quality];
      //   const toShuffle = [...curResponse].sort(() => Math.random() - 0.5);
      //   session = {...session, ...{conMes: toShuffle}};
      //   if (!toShuffle) 
      //   {
      //     print_log(`toshuffle is empty, curItem: ${curItem}, quality: ${session.quality}`);
      //     print_log(toShuffle,-1);
      //   }
        
      // } 

        userSession.set(userId, session);
      
      } 
      
      else {
        /** match with HUM or CON or GPT */
        const newOrder = [MATCH_CONDITION];
        const newItems = getOneRandomItem();
        session = userSession.get(userId);
        print_log("matchUser: previous session is ended, create new one", 5);
        print_log(newOrder, 5);
        print_log(newItems, 5);

        if (MATCH_CONDITION === 'HUM' ) 
        {
          // TODO: match users together
          if (lastUser !== '' && lastUser !== userId) {
            /** matched user */
            const lastsession = userSession.get(lastUser);
            session = {...session, ...{matchedUser: lastUser}};
            userSession.set(userId, session);
            userSession.set(lastUser, {...lastsession, ...{matchedUser: userId}});
            print_log(`matchUser: ${userId} matched to ${lastUser}`, 5);
            lastUser = '';
          } else {
            lastUser = userId;
          }
        } 

        if (MATCH_CONDITION === 'CON' ) 
        {
          /** randomly assign user high or low quality response */
          if (Math.random() >= 0.66) {
              session = {...session, ...{quality: 'high'}};
          } else if (Math.random() >= 0.33) {
              session = {...session, ...{quality: 'gpt'}};
          } else {
              session = {...session, ...{quality: 'low'}};
          }
          //TODO: get shuffle messages
          const curItem = newItems[0];
          //print_log(`matchUser: curItem: ${curItem}, quality: ${session.quality}`);
          const curResponse = constResponses[curItem][session.quality];
          const toShuffle = [...curResponse].sort(() => Math.random() - 0.5);
          session = {...session, ...{conMes: toShuffle}};
          if (!toShuffle) {
            print_log(`toshuffle is empty, curItem: ${curItem}, quality: ${session.quality}`);
            print_log(toShuffle,-1);
          }
          
        }

        const typeList = await createChatRoomListService(userId, newOrder);
        session = {...session, ...{ended: false,  types: newOrder, items: newItems, currentI: 0, currentList: typeList._id}};
        userSession.set(userId, session);
      }

    }


    /** when we start matching we always wanna set isMatching to true */
    userSession.set(userId, {...session, ...{isMatching: true}});
    const curI = session.currentI;
    const curType = session.types[curI];
    const curItem = session.items[curI];
    print_log(`matchUser: curI ${curI}`, 5);
    const curList = session.currentList;
    if (curType=="HUM") {
      if (session.matchedUser !== undefined && session.matchedUser !== null) {
        /** current user already matched */
        const firstUser = session.matchedUser;
        const firstsession = userSession.get(firstUser);
        if (!onlineUsers.has(userId) || !onlineUsers.has(firstUser)) {
          print_log(`one user is not online!`);
        } else if (!firstsession.isMatching) {
          /** paired user haven't reach human part, need to wait */
          print_log('user partner has not reach this part');
        } else {
          print_log("match success");
          const matchedUserSocket = onlineUsers.get(firstUser);
          const currentUserSocket = onlineUsers.get(userId);
          if (!matchedUserSocket) {
            print_log("matched user not alive");
          }
          if (!currentUserSocket) {
            print_log("current user not alive");
          }
          const newChatRoom = await createChatRoomService([userId,firstUser], curItem, curType, curList);
          await appendChatRoomService(newChatRoom._id, curList);
          userSession.set(firstUser, {...firstsession, ...{currentChatRoom: newChatRoom, isMatching:false}});
          userSession.set(userId, {...session, ...{currentChatRoom: newChatRoom, isMatching:false}});
          socket.emit("matchedUser", {data:newChatRoom, index:curI});
          socket.to(matchedUserSocket).emit("matchedUser", {data:newChatRoom, index:curI});
          // userToRoom.set(userId, newChatRoom._id.toString());
          // userToRoom.set(firstUser, newChatRoom._id.toString());
        }
      } else {
        /** current user has no paired user yet */
        print_log(`${userId} has no matched human yet`);
      }
    } else {
      // match with AI
      const newChatRoom = await createChatRoomService([userId, AI_UID], curItem, curType, curList);
      await appendChatRoomService(newChatRoom._id, curList);
      userSession.set(userId, {...session, ...{isMatching:false, currentChatRoom: newChatRoom}});

      //print_log(`newchatroom types: ${newChatRoom.chatType}`);
      
      if (newChatRoom.chatType === 'CON')
      {
          
          /** randomly assign user high or low quality response */
          if (Math.random() >= 0.66) 
          {
            session = {...session, ...{quality: 'high'}};
          } 
          else if (Math.random() >= 0.33) 
          {
            session = {...session, ...{quality: 'gpt'}};
          } 
          else 
          {
            session = {...session, ...{quality: 'low'}};
          }
        //TODO: get shuffle messages
        
        //print_log(`matchUser: curItem: ${curItem}, quality: ${session.quality}`);
        
        const curResponse = constResponses[curItem][session.quality];
        const toShuffle = [...curResponse].sort(() => Math.random() - 0.5);
        session = {...session, ...{conMes: toShuffle}};
        if (!toShuffle) 
        {
          print_log(`toshuffle is empty, curItem: ${curItem}, quality: ${session.quality}`);
          print_log(toShuffle,-1);
        }
        
      }
      userSession.set(userId, {...session, ...{isMatching:false, currentChatRoom: newChatRoom}});


      print_log(userSession.get(userId),5);


      //print_log("ABOUT TO ENTER NEWCHATROOM != NULL",5);
      if (newChatRoom !== null) {
        socket.emit("matchedUser", {data:newChatRoom, index:curI});
        chatMessage.set(userId, [{text: curItem, sender: 0, replied: true}]);
        // userToRoom.set(userId, newChatRoom._id.toString());
        // userToIndex.set(userId, 0); //start with zero one,
      }
    }
    
  });

  socket.on("ready", async({chatRoom, userId}) => {
    const curType = chatRoom.chatType;
    // print_log(`ready: ${curType}`);
    const curId = chatRoom._id.toString();
    if (curType !=='HUM') { //const or gpt
      let multiply = 1000;
      if (curType === 'GPT') 
      {
        WAIT_TIME_DIFF = 1;
        WAIT_TIME = 12;
        multiply = 100;
      }
      // print_log("ready: AI");
      // await new Promise(r => setTimeout(r, 2000));
      socket.emit("userReady", {senderId: AI_UID});
      setTimeout(async function chat() {
        const session = userSession.get(userId);
        const room = session.currentChatRoom;
        if (room && room._id.toString() === curId) {
          /** need to ensure room is not null or undefined, and current room is what we expect */
          await reply_message(userId);
          setTimeout(chat, (WAIT_TIME-randSubAdd())*multiply); 
        } else {
          /** if it is null, then reply should end */
          if (!room) {
            /** room is null */
            print_log('ready: current room is null or undefined', 1);
          } else {
            print_log(`ready: room id ${curId} different to ${room._id}`, 1);
          }
          print_log(`AI reply for ${userId} has ended`, 1);
        }
      }, (WAIT_TIME-randSubAdd())*multiply); //CHANGE THIS LATER 
    } else {
      // print_log("ready: human")
      let otherUser = chatRoom.members[0];
      if (otherUser === userId) {
        otherUser = chatRoom.members[1];
      }
      print_log(`${userId} ready, send to ${otherUser}`, 1)
      const toSocket = onlineUsers.get(otherUser);
      socket.to(toSocket).emit("userReady", {senderId: userId});
    }

  })

  socket.on("timeout", async({roomId, userId}) => {
    //time is running out, the chat room ends normally
    let session = userSession.get(userId);
    if (session) {
      const room = session.currentChatRoom;
      if (room) {
        
        const curroomId = room._id.toString();
        const curI = session.currentI;
        print_log(`timeout: current index: ${session.currentI}`, 5);
        if (curroomId !== roomId) {
          print_log(`timeout: given roomId ${roomId} does not match current roomId ${curroomId}`);
        }
        if (curI === session.types.length-1) {
          /** current three session has ended */
          session = {...DEFAULT_SESSION, ...{disconnecttime: new Date()}};
        } else {
          session = {...session, ...{currentI: curI+1, currentChatRoom: null}};
        }
        print_log(`timeout: current index: ${session.currentI}`, 5);
        userSession.set(userId, session);
        endChatRoomService(roomId, false);
      } else {
        print_log(`timeout: room not found for current session`);
      }
    } else {
      print_log(`timeout: ending a unexist session`);
    }
  })

  socket.on("ping", async({userId}) => {
    print_log('pong', 2);
    const sendUserSocket = onlineUsers.get(userId);
    if (sendUserSocket !== undefined) {
      socket.to(sendUserSocket).emit('pong');
    }
  })
});
