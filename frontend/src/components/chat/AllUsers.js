import { useState, useEffect } from "react"
import Contact from "./Contact"

function classNames(...classes) {
  return classes.filter(Boolean).join(" ")
}

export default function AllUsers({
  chatRooms,
  setCurrentChat,
  currentUser,
  currentChat,
  changeChat,
  socket,
  currentSession,
  setCurrentSession,
  matchedData,
  setMatchedData,
}) {
  const [selectedChat, setSelectedChat] = useState()
  const [loadingStart, setLoadingStart] = useState(false)
  const [matching, setMatching] = useState(false)
  const [hasRoom, setHasRoom] = useState(chatRooms.length > 0)
  const [pendingChat, setPendingChat] = useState(null)

  useEffect(() => {
    if (pendingChat && loadingStart) {
      handleStartClick()
    }
  }, [pendingChat])

  useEffect(() => {
    const Ids = chatRooms
      .filter((chatRoom) => !chatRoom.isEnd)
      .map((chatRoom) =>
        chatRoom.members.find((member) => member !== currentUser.uid),
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
      socket.current.emit("startRound", { userId: currentUser.uid })

      // Preload pendingChat for next round
      const nextIndex = 1
      const nextChatRoom = chatRooms.find(
        (room) =>
          !room.isEnd &&
          room.index === nextIndex &&
          room.chatType === session.types[nextIndex],
      )
      if (nextChatRoom) {
        nextChatRoom.index = nextIndex
        nextChatRoom.chatType = session.types[nextIndex]
        setPendingChat(nextChatRoom)
      } else {
        setPendingChat(null)
      }
    }

    setMatchedData(null)
  }, [matchedData])

  useEffect(() => {
    const sock = socket.current
    if (!sock) return

    const handleMatchedUser = ({ data, index, session }) => {
      console.log("[Socket] matchedUser received in AllUsers.js", data)

      data.index = index
      data.chatType = session.types[index]

      setCurrentSession(session)
      setPendingChat(data)
      if (index === 0) {
        setCurrentChat(data)
        socket.current.emit("startRound", { userId: currentUser.uid })
      }
    }

    sock.on("matchedUser", handleMatchedUser)

    return () => {
      sock.off("matchedUser", handleMatchedUser)
    }
  }, [socket, setCurrentChat, setCurrentSession])

  const handleMatchNewUser = () => {
    if (!matching && !hasRoom) {
      console.log(
        "[Client:Match] Emitting match request for user:",
        currentUser.uid,
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
      currentSession?.currentI > -1 &&
      currentSession.currentI < 3
    ) {
      socket.current.emit("startRound", { userId: currentUser.uid })
      setLoadingStart(true)

      if (pendingChat) {
        setCurrentChat(pendingChat)
        setPendingChat(null)
        setLoadingStart(false)
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
          {(!currentSession || currentSession.currentI === -1) && !hasRoom && (
            <button
              className={`transition duration-150 ease-in-out flex items-center px-3 py-2 text-sm border-b
        ${
          matching
            ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400"
            : "cursor-pointer bg-white hover:bg-gray-100 dark:text-white dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-700"
        }`}
              onClick={handleMatchNewUser}
              disabled={matching}
            >
              {matching ? "Matching..." : "Match"}
            </button>
          )}
        </li>
        <li>
          {currentSession &&
            currentSession.currentI > -1 &&
            currentSession.currentI < 2 &&
            currentChat?.isEnd && (
              <button
                className="dark:text-white transition duration-150 ease-in-out cursor-pointer bg-white border-b border-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-700 flex items-center px-3 py-2 text-sm gap-2"
                onClick={handleStartClick}
                disabled={loadingStart}
              >
                {loadingStart ? (
                  currentSession.types[currentSession.currentI + 1] ===
                  "HUM" ? (
                    <>
                      <span className="spinner"></span>
                      Waiting for partner to join...
                    </>
                  ) : (
                    <span className="spinner"></span>
                  )
                ) : (
                  "Start"
                )}
              </button>
            )}
        </li>
      </ul>
    </>
  )
}
