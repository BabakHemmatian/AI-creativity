import { useState, useEffect } from "react"
import Contact from "./Contact"

function classNames(...classes) {
  return classes.filter(Boolean).join(" ")
}

export default function AllUsers({
  chatRooms,
  setCurrentChat,
  currentUser,
  changeChat,
  socket,
  currentSession,
  setCurrentSession,
  matchedData,
  setMatchedData,
}) {
  const [selectedChat, setSelectedChat] = useState()
  const [matching, setMatching] = useState(false)
  const [hasRoom, setHasRoom] = useState(chatRooms.length > 0)
  const [pendingChat, setPendingChat] = useState(null)

  useEffect(() => {
    const Ids = chatRooms
      .filter((chatRoom) => !chatRoom.isEnd)
      .map((chatRoom) =>
        chatRoom.members.find((member) => member !== currentUser.uid)
      )

    if (Ids.length === 0) setHasRoom(false)
  }, [chatRooms, currentUser.uid])

  useEffect(() => {
    setHasRoom(chatRooms.length > 0)
    if (chatRooms.length === 0) setMatching(false)
  }, [chatRooms])

  useEffect(() => {
    if (!matchedData) return

    const { data, session } = matchedData
    const curIndex = session.currentI
    const chatType = session.types[curIndex]

    data.index = curIndex
    data.chatType = chatType

    setPendingChat(data)
    setCurrentSession(session)
    setHasRoom(true)
    setMatching(false)

    if (curIndex === 0) {
      setCurrentChat(data)
      setPendingChat(null)
      socket.current.emit("startRound", { userId: currentUser.uid })
    }

    setMatchedData(null)
  }, [matchedData])

  const handleMatchNewUser = () => {
    if (!matching && !hasRoom) {
      console.log(
        "[Client:Match] Emitting match request for user:",
        currentUser.uid
      )
      setMatching(true)
      setTimeout(() => {
        socket.current.emit("matchUser", { userId: currentUser.uid })
      }, 100)
    }
  }

  const handleStartClick = () => {
    if (
      socket &&
      currentUser &&
      currentSession?.currentI > 0 &&
      currentSession.currentI < 3
    ) {
      console.log("[Client:Start] Emitting startRound for:", currentUser.uid)
      socket.current.emit("startRound", { userId: currentUser.uid })
      if (pendingChat) {
        setCurrentChat(pendingChat)
        setPendingChat(null)
      }
    }
  }

  const changeCurrentChat = (index, chat) => {
    setSelectedChat(index)
    changeChat(chat)
  }

  return (
    <>
      <ul className="overflow-auto h-[30rem]">
        <h2 className="my-2 mb-2 ml-2 text-gray-900 dark:text-white">Chats</h2>
        <li>
          {!hasRoom && (
            <button
              className="dark:text-white transition duration-150 ease-in-out cursor-pointer bg-white border-b border-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-700 flex items-center px-3 py-2 text-sm "
              onClick={handleMatchNewUser}
            >
              {matching ? "matching" : "match"}
            </button>
          )}
        </li>
        <li>
          {currentSession &&
            currentSession.currentI > 0 &&
            currentSession.currentI < 3 &&
            (!chatRooms.length || chatRooms.every((room) => room.isEnd)) && (
              <button
                className="mt-2 mb-2 ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleStartClick}
              >
                Start
              </button>
            )}
        </li>
        <li>
          {chatRooms
            .filter((chatRoom) => !chatRoom.isEnd)
            .map((chatRoom, index) => (
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
                {chatRoom.members.includes("AI") ||
                chatRoom.members.length === 1 ? (
                  <div className="text-gray-800 dark:text-white font-semibold">
                    {chatRoom.chatType === "GPT"
                      ? "Chat with GPT"
                      : "CONSTANT Response"}
                  </div>
                ) : (
                  <Contact chatRoom={chatRoom} currentUser={currentUser} />
                )}
              </div>
            ))}
        </li>
      </ul>
    </>
  )
}
