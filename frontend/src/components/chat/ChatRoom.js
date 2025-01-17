import { useState, useEffect, useRef } from "react";
import { useTimer } from 'use-timer';
import { getMessagesOfChatRoom, sendMessage, endChatRoom} from "../../services/ChatService";

import Message from "./Message";
import Contact from "./Contact";
import ChatForm from "./ChatForm";
import { parseInstruction, parseEndInstruction } from "../../utils/parseInstruction";

const Ins1 = "We will now play three rounds of a two-player version of the game you just practiced. Each round has a brainstorming and a curation portion. For the brainstorming portion, you and a paired player will use this chat platform to come up with creative uses for an everyday object. Your partner in the brainstorming step may be interactive or non-interactive, an AI or a fellow human. You will have 4 minutes</span> to chat. After each brainstorming session, you will go back to the first tab in your browser to curate and submit your best creative uses for the target object. You will be evaluated based on how many uses you generate in this curated response, their originality, surprisingness, and practical usefulness. When ready to start this part of the study, please respond in the chat with 'ready'. Once both matched players have indicated their readiness, the game’s target object will be revealed underneath this instruction and the timer will begin."


// https://openbase.com/js/use-timer, library used for timer
//currentChat is the object of ChatRoom
export default function ChatRoom({
  currentChat, 
  currentUser, 
  socket, 
  handleEndChatRoom,
  currentSession
}) {
  // console.log(currentChat);
  const [messages, setMessages] = useState([]);
  const [incomingMessage, setIncomingMessage] = useState(null);
  const [ready, setReady] = useState(0); //ready initially holds 0 then 
  const [prevAI, setPrevAI] = useState(false);
  const [change, setChange] = useState(false);
  // const [currentId, setCurrentId] = useState(currentChat._id);
  const currentId = useRef(currentChat._id);
  // const [end, setEnd] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // const latestCount = useRef(count);
  const { time, start, pause, reset, status } = useTimer({
    initialTime: process.env.REACT_APP_SESSION_TIME || 240,
    endTime: 0,
    timerType: 'DECREMENTAL',
    onTimeOver: () => {
      // console.log("send end request");
      socket.current.emit("timeout", {roomId: currentChat._id, userId: currentUser.uid});
      // endChatRoom(currentChat._id);
      handleEndChatRoom();
      currentChat.isEnd = true;
      if (currentChat.chatType!=="HUM") {
        // console.log(currentChat.chatType);
        setPrevAI(true);
      }
    },
  }); 
  const scrollRef = useRef();
  // useEffect(() => {
  //   /** recover part */
  //   setMessages([]);
  //   // setIncomingMessage([]);
  //   setReady(0);
  //   // const curI = currentSession.currentI;
  //   // if ()
    
  // }, [currentSession])

  useEffect(() => { // calls when ready changes
    if (ready === 3) { // when ready is 3, start timer
      start();
    }
  }, [ready])


  useEffect(() => {  // calls when currentChat_id changes
    currentId.current = currentChat._id; // update currentId
    setReady(0); // set ready back to 0
    reset(); // reset timer
    setMessages([]); // reset messages array
    if (prevAI) { 
      setChange(true);
    }
  }, [currentChat._id]);


  useEffect(() => {
    scrollRef.current?.scrollIntoView({
      behavior: "smooth",
    });
    // console.log("messages")
    // console.log(messages);
    // console.log("filtered")
    // console.log(messages.filter(mess => mess.roomId === currentId.current))
  }, [messages]);


  useEffect(() => {
    socket.current?.on("getMessage", (data) => {
      // console.log("message data");
      // console.log(data)
      console.log("getMessage: recieved");
      if (currentChat.chatType === "GPT") {
        setIsProcessing(false);  // Re-enable input only in GPT mode
      }

      if (data.roomId === currentId.current) {
        // console.log("equal room id")
        setIncomingMessage({
          senderId: data.senderId,
          message: data.message,
          roomId: data.roomId
        });
        // console.log(messages)
        // setMessages((prev) => [...prev, {senderId: data.senderId, message: data.message,}])
      } else {
        // console.log(`current chat id ${currentId.current}`);
        // console.log(`message room id ${data.roomId}`);
      }
      // console.log(messages);
    });
    socket.current?.on("userReady", (data) => {
      console.log('userReady: recieved')
      setReady(prevready => prevready | 1);
      setIncomingMessage({
        senderId: data.senderId,
        message: "ready",
        roomId: currentId.current,
      });
      
    })
    socket.current?.on("refresh", () => {
      alert('The co-player’s connection to the server was severed. Please refresh this page to start this session again. We apologize for the inconvenience.');
    })
  }, [socket]);



  useEffect(() => {
    incomingMessage && setMessages((prev) => [...prev, incomingMessage]);
  }, [incomingMessage]);

  
  const handleFormSubmit = async (message) => {
    console.log(`HandleforSubmit : ${message}`);

    if (currentChat.chatType === "GPT" && isProcessing) {
      return; // Prevent sending another message in GPT mode
    }

    if (currentChat.chatType === "GPT") {
      setIsProcessing(true);  // Disable input only in GPT mode
    }
    
    if (message === "ready" && ready !== 3) {
      setReady(prevready => prevready | 2);
      setMessages([...messages, {roomId: currentId.current, sender: currentUser.uid, message: "ready"}]); //set but will not write to mongodb
      socket.current.emit("ready", {chatRoom: currentChat, userId: currentUser.uid});
    } else if (ready !== 3) {
      alert("please first type ready!");
    } else if (currentChat.isEnd) {
      alert("current chat room has ended, but you can match a new one");
    } else {
      const receiverId = currentChat.members.find(
        (member) => member !== currentUser.uid
      );
  
      socket.current.emit("sendMessage", {
        senderId: currentUser.uid,
        receiverId: receiverId,
        message: message,
        chatRoom: currentChat,
      });
  
      const messageBody = {
        roomId: currentId.current,
        sender: currentUser.uid,
        message: message,
      };
      // const res = await sendMessage(messageBody);
      // console.log(messageBody);
      setMessages([...messages, messageBody]);
    }
  };

  return (
    <div className="lg:col-span-2 lg:block">
      <div className="w-full">
        <div className="p-3 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <Contact chatRoom={currentChat} currentUser={currentUser} />
        </div>

        <div className="relative w-full p-6 overflow-y-auto h-[30rem] bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <ul className="space-y-2">
            <li>
              {parseInstruction(currentChat.index, currentChat.chatType, change)}
            </li>
            <li className='dark:text-white' style={{ fontWeight: 'bold' }}>
              <div>
                {(ready===3) && (`The object you will be coming up with creative uses for is: ${currentChat.instruction}`)}
              </div>
            </li>
            {messages.filter(mess => mess.roomId === currentId.current).map((message, index) => (
              <div key={index} ref={scrollRef}>
                <Message message={message} self={currentUser.uid} />
              </div>
            ))}
            <li className='dark:text-white' style={{ fontWeight: 'bold' }}>
              {`This chat room will end in ${time} seconds`}
            </li >
            <li className='dark:text-white' style={{ fontWeight: 'bold' }}>
              {time === 0 && parseEndInstruction(currentChat.index)}
              {/* {(time === 0 && currentChat.index===0) && (
                <span>
                  You have completed the first round of the two-player version of the game. 
                  You have two more rounds left to play. 
                  When ready to start the second round, please click on the ‘match’ button to the left of this chat screen.
                </span>)}
              {(time === 0 && currentChat.index===1) && (
                <span>
                  You have completed the second round of the two-player game. You have one more round to play. When ready to start the last round, please click on the ‘match’ button to the left of this chat screen.
                </span>)}
              {(time === 0 && currentChat.index===2) && (
                <span>The 2-player part of our study has ended. Thank you! When ready please click on the following link to answer a few more questions and finish the study:
                  <a href="https://illinoisaces.co1.qualtrics.com/jfe/form/SV_81EIXvlwZDAncOi">Final Survey</a>
                </span>)} */}
              {/* {(time === 0 && currentChat.index < 2) && (
                <span>
                  Thank you. This round of the game has ended. 
                  <span style={{fontWeight:'bold'}}>Please do NOT refresh this page.</span> 
                  Click on the “match” button again to start the next round.
                </span>)} */}
            </li>
          </ul>
        </div>

        <ChatForm handleFormSubmit={handleFormSubmit} isProcessing={isProcessing} />
      </div>
    </div>
  );
}
