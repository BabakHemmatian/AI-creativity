import { useState, useEffect } from "react";

import { createChatRoom } from "../../services/ChatService";
import Contact from "./Contact";
import UserLayout from "../layouts/UserLayout";
import { async } from "@firebase/util";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function AllUsers({
  users,
  chatRooms,
  setChatRooms,
  onlineUsersId,
  currentUser,
  changeChat,
  socket,
}) {
  const [selectedChat, setSelectedChat] = useState();
  // const [nonContacts, setNonContacts] = useState([]);
  const [contactIds, setContactIds] = useState([]);
  const [matching , setMatching] = useState(false);

  
  // console.log(socket.current.id);

  useEffect(() => {
    const Ids = chatRooms.map((chatRoom) => {
      return chatRoom.members.find((member) => member !== currentUser.uid);
    });
    setContactIds(Ids);
  }, [chatRooms, currentUser.uid]);

  // useEffect(() => {
  //   setNonContacts(
  //     users.filter(
  //       (f) => f.uid !== currentUser.uid && !contactIds.includes(f.uid)
  //     )
  //   );
  // }, [contactIds, users, currentUser.uid]);

  // useEffect(() => {
  //   socket.current?.on("matchedUserCreate", (data) => {
  //     console.log(`socket ${socket.current.id} recieve data`);
  //     console.log(`create back data: ${data}`);
  //     if (matching) {
  //       setMatching(false);
  //       // handleNewChatRoom(data);
  //     }
  //   });
  // });

  useEffect(() => {
    socket.current?.on("matchedUser", (data) => {
      if (matching) {
        console.log(`socket ${socket.current.id} recieve data`);
        // console.log(`not back data: ${data}`);
        console.log(data);
        setChatRooms((prev) => [...prev, data]);
        changeChat(data);
        setMatching(false);
      }
    });
  })

  const changeCurrentChat = (index, chat) => {
    setSelectedChat(index);
    changeChat(chat);
  };

  // this function will call the API for creating new chat room
  // const handleNewChatRoom = async (userId) => {
  //   const members = {
  //     senderId: currentUser.uid,
  //     receiverId: userId,
  //   };
  //   const res = await createChatRoom(members);
  //   setChatRooms((prev) => [...prev, res]);
  //   changeChat(res);
  // };



  //
  const handleMatchNewUser = async (user) => {
    // alert("//TODO: use api to match a new user")
    if (!matching) {
      setMatching(true);
      socket.current.emit("matchUser", {
        userId: currentUser.uid,
      });
    }
  }

  return (
    <>
      <ul className="overflow-auto h-[30rem]">
        <h2 className="my-2 mb-2 ml-2 text-gray-900 dark:text-white">Chats</h2>
        <li>
          <button
            className="transition duration-150 ease-in-out cursor-pointer bg-white border-b border-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-700 flex items-center px-3 py-2 text-sm "
            onClick={handleMatchNewUser}>
            {matching === true ? ('matching') : ('match')}
          </button>
        </li>
        <li>
          {chatRooms.map((chatRoom, index) => (
            <div
              key={index}
              className={classNames(
                index === selectedChat
                  ? "bg-gray-100 dark:bg-gray-700"
                  : "transition duration-150 ease-in-out cursor-pointer bg-white border-b border-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-700",
                "flex items-center px-3 py-2 text-sm "
              )}
              onClick={() => changeCurrentChat(index, chatRoom)}
            >
              <Contact
                chatRoom={chatRoom}
                onlineUsersId={onlineUsersId}
                currentUser={currentUser}
              />
            </div>
          ))}
        </li>
        <h2 className="my-2 mb-2 ml-2 text-gray-900 dark:text-white">
          Other Users
        </h2>
        {/* <li>
          {nonContacts.map((nonContact, index) => (
            <div
              key={index}
              className="flex items-center px-3 py-2 text-sm bg-white border-b border-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => handleNewChatRoom(nonContact)}
            >
              <UserLayout user={nonContact} onlineUsersId={onlineUsersId} />
            </div>
          ))}
        </li> */}
      </ul>
    </>
  );
}
