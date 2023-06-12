import { useEffect, useRef, useState } from "react";

import {
  getAllUsers,
  getChatRooms,
  initiateSocketConnection,
} from "../../services/ChatService";
import { useAuth } from "../../contexts/AuthContext";

import ChatRoom from "../chat/ChatRoom";
import Welcome from "../chat/Welcome";
import AllUsers from "../chat/AllUsers";
import SearchUsers from "../chat/SearchUsers";

export default function ChatLayout() {
  const [users, SetUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);

  const [currentChat, setCurrentChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cursession, setCursession] = useState(null);

  const [isContact, setIsContact] = useState(false);

  /** disable operation, try to figure out current session */
  const [load, setLoad] = useState(false);

  const socket = useRef();

  const { currentUser } = useAuth();


  useEffect(() => {
    const getSocket = async () => {
      const res = await initiateSocketConnection();
      socket.current = res;
      socket.current.emit("addUser", currentUser.uid);
      setLoad(true); /** disable operation */
      socket.current.on("getSession", ({isRecover, session}) => {
        console.log(`getSession: recieved`);
        // console.log(session);
        if (isRecover) {
          /** TODO: recover session */

          if (session.currentChatRoom !== null && session.currentChatRoom !== undefined) {
            const curroom = session.currentChatRoom;
            curroom.index = session.currentI;
            setCurrentChat(curroom);
            setChatRooms([curroom]);
          }
          
          setCursession(session);
          
        } 
        setLoad(false);
      });
    };

    getSocket();
  }, [currentUser.uid]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await getAllUsers();
      SetUsers(res);
    };

    fetchData();
  }, []);

  useEffect(() => {
    setFilteredUsers(users);
    setFilteredRooms(chatRooms);
  }, [users, chatRooms]);

  useEffect(() => {
    if (isContact) {
      setFilteredUsers([]);
    } else {
      setFilteredRooms([]);
    }
  }, [isContact]);

  const handleChatChange = (chat) => {
    setCurrentChat(chat);
  };

  useEffect(() => {
    //heart check avoiding auto disconnection

    setTimeout(async function chat() {
      console.log('ping');
      socket.current.emit('ping', {userId: currentUser});
      setTimeout(chat, 40*1000);
    }, 40*1000);
    // console.log(currentChat)
  }, [])

  const handleEndChatRoom = async () => {
    setChatRooms([]);
  }

  return (
    <div className="container mx-auto">
      <div className="min-w-full bg-white border-x border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700 rounded lg:grid lg:grid-cols-3">
        <div className="bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-700 lg:col-span-1">
          {/* <SearchUsers handleSearch={handleSearch} /> */}
          {load && (
          <div id="load-mask">
            <span id="load-alert">loading user information...</span>
          </div>)}
          <AllUsers
            chatRooms={searchQuery !== "" ? filteredRooms : chatRooms}
            currentSession={cursession}
            setCurrentChat={setCurrentChat}
            currentUser={currentUser}
            changeChat={handleChatChange}
            socket={socket}
          />
        </div>

        {(currentChat !== null) ? (
          <ChatRoom
            currentChat={currentChat}
            currentUser={currentUser}
            socket={socket}
            handleEndChatRoom={handleEndChatRoom}
            currentSession={cursession}
          />
        ) : (
          <Welcome />
        )}
      </div>
    </div>
  );
}
