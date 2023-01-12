import { useState, useEffect, useRef } from "react";

import { getMessagesOfChatRoom, sendMessage } from "../../services/ChatService";

import Message from "./Message";
import Contact from "./Contact";
import ChatForm from "./ChatForm";

const startIns = "Hi! This is a game where you and a matched player take turns coming up with creative uses for an everyday object, one at a time. If you have already entered a response, please wait for your co-player to provide their entry before providing another creative use. Once started, you and your co-player will have 4 minutes to come up with as many responses as you can. You will be evaluated based on how many uses you come up with, their originality, diversity and usefulness. When ready, please respond in the chat with 'ready'."
const yourTurn = "It is now your turn.";
const otherTurn = "It is now the other player's turn."

//currentChat is the object of ChatRoom
export default function ChatRoom({ currentChat, currentUser, socket }) {
  const [messages, setMessages] = useState([]);
  const [incomingMessage, setIncomingMessage] = useState(null);

  const scrollRef = useRef();

  var instruction = "";
  if (currentChat.members[0] === currentUser.uid) {
    //user first
    instruction = startIns.concat(currentChat.instruction, yourTurn);
  } else {
    instruction = startIns.concat(currentChat.instruction, otherTurn);
  }

  useEffect(() => {
    const fetchData = async () => {
      const res = await getMessagesOfChatRoom(currentChat._id);
      setMessages(res);
    };

    fetchData();
  }, [currentChat._id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    socket.current?.on("getMessage", (data) => {
      setIncomingMessage({
        senderId: data.senderId,
        message: data.message,
      });
    });
  }, [socket]);

  useEffect(() => {
    incomingMessage && setMessages((prev) => [...prev, incomingMessage]);
  }, [incomingMessage]);

  const handleFormSubmit = async (message) => {
    //check if the last message is sent by current user
    if (messages.length > 0) {
      const lastMessage = messages[messages.length-1];
      if (currentUser.uid === lastMessage.sender) {
        // if yes, alert user wait for reply
        alert("you should wait for the reply before sending the next message");
      }
    } else if (currentChat.members[0] !== currentUser.uid) {
      //the user is not suppose to start the message
      alert("you should wait for the reply before sending the next message");
    }

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
              <div>
                {instruction}
              </div>
            </li>
            {messages.map((message, index) => (
              <div key={index} ref={scrollRef}>
                <Message message={message} self={currentUser.uid} />
              </div>
            ))}
          </ul>
        </div>

        <ChatForm handleFormSubmit={handleFormSubmit} />
      </div>
    </div>
  );
}
