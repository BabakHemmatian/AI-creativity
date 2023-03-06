import { useState, useEffect, useRef } from "react";
import { useTimer } from 'use-timer';
import { getMessagesOfChatRoom, sendMessage, endChatRoom} from "../../services/ChatService";

import Message from "./Message";
import Contact from "./Contact";
import ChatForm from "./ChatForm";

const startIns = process.env.REACT_APP_INSTRUCTION
// const otherTurn = "It is now the other player's turn."
// https://openbase.com/js/use-timer, library used for timer
//currentChat is the object of ChatRoom
export default function ChatRoom({ currentChat, currentUser, socket, handleEndChatRoom}) {
  const [messages, setMessages] = useState([]);
  const [incomingMessage, setIncomingMessage] = useState(null);
  const [ready, setReady] = useState(0);
  // const [end, setEnd] = useState(false);

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
    },
  }); 
  const scrollRef = useRef();

  useEffect(() => {
    if (ready === 3) {
      start();

      //heart check avoiding auto disconnection
      setTimeout(async function chat() {
        if (!currentChat.isEnd) {
          console.log('ping');
          socket.current.emit('ping', {userId: currentUser});
          setTimeout(chat, 40*1000);
        }
      }, 40*1000);
    }
  }, [ready])

  useEffect(() => {
    const fetchData = async () => {
      const res = await getMessagesOfChatRoom(currentChat._id);
      setMessages(res);
    };
    setReady(0);
    reset();
    fetchData();
  }, [currentChat._id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({
      behavior: "smooth",
    });
    // console.log(messages);
  }, [messages]);

  useEffect(() => {
    socket.current?.on("getMessage", (data) => {
      // console.log("message data");
      // console.log(data);
      setIncomingMessage({
        senderId: data.senderId,
        message: data.message,
      });
    });
    socket.current?.on("userReady", (data) => {
      setReady(prevready => prevready | 1);
      setIncomingMessage({
        senderId: data.senderId,
        message: "ready",
      });
      
    })
  }, [socket]);

  useEffect(() => {
    incomingMessage && setMessages((prev) => [...prev, incomingMessage]);
  }, [incomingMessage]);

  const handleFormSubmit = async (message) => {
    if (message === "ready" && ready !== 3) {
      setReady(prevready => prevready | 2);
      setMessages([...messages, {chatRoomId: currentChat._id, sender: currentUser.uid, message: "ready"}]); //set but will not write to mongodb
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
      });
  
      const messageBody = {
        chatRoomId: currentChat._id,
        sender: currentUser.uid,
        message: message,
      };
      const res = await sendMessage(messageBody);
      setMessages([...messages, res]);
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
              <div className='dark:text-white' >
                {startIns}
              </div>
            </li>
            <li className='dark:text-white' style={{ fontWeight: 'bold' }}>
              <div>
                {(ready===3) && (`The object you will be coming up with creative uses for is: ${currentChat.instruction}`)}
              </div>
            </li>
            <li className='dark:text-white' style={{ fontWeight: 'bold' }}>
              {(time <= 10) && (time > 0) && (`This chat room will end in ${time} seconds`)}
            </li >
            {messages.map((message, index) => (
              <div key={index} ref={scrollRef}>
                <Message message={message} self={currentUser.uid} />
              </div>
            ))}
            <li className='dark:text-white' style={{ fontWeight: 'bold' }}>
              {(time === 0) && (`The session has ended`)}
            </li>
          </ul>
        </div>

        <ChatForm handleFormSubmit={handleFormSubmit} />
      </div>
    </div>
  );
}
