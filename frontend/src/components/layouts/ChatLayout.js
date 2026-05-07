import { useEffect, useRef, useState, useCallback } from "react"
import {
  getAllUsers,
  getChatRooms,
  initiateSocketConnection,
} from "../../services/ChatService"
import { useAuth } from "../../contexts/AuthContext"

import ChatRoom from "../chat/ChatRoom"
import Welcome from "../chat/Welcome"
import AllUsers from "../chat/AllUsers"
import SurveyReminderPopup from "../chat/SurveyReminderPopup"

export default function ChatLayout() {
  const [users, SetUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [chatRooms, setChatRooms] = useState([])
  const [filteredRooms, setFilteredRooms] = useState([])

  const [currentChat, setCurrentChat] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [cursession, setCursession] = useState(null)

  const [isContact, setIsContact] = useState(false)
  const [load, setLoad] = useState(false)

  const socket = useRef()
  const { currentUser } = useAuth()

  const [matchedData, setMatchedData] = useState(null)

  // Qualtrics reminder popup: shown on every round end and on study
  // completion. Dismissal is keyed by "<phase>:<currentI>" so that
  // dismissing it for round 0's end does NOT suppress it when round 1
  // later ends. The popup is purely presentational — it never touches
  // socket/session state.
  const [surveyReminderDismissedKey, setSurveyReminderDismissedKey] =
    useState(null)
  const surveyReminderKey =
    cursession?.phase === "round_ended"
      ? `round_ended:${cursession.currentI}`
      : cursession?.phase === "completed"
        ? "completed"
        : null
  const showSurveyReminder =
    !!surveyReminderKey && surveyReminderDismissedKey !== surveyReminderKey

  useEffect(() => {
    const getSocket = async () => {
      console.log("[Socket:Setup] Starting socket event listener setup")
      const res = await initiateSocketConnection()
      socket.current = res

      res.on("connect", () => {
        console.log("[Socket:Connection] Connected with ID:", res.id)
        console.log("[Socket:Connection] User ID:", currentUser.uid)
      })

      // Attach matchedUser listener BEFORE emit
      res.off("matchedUser").on("matchedUser", ({ data, index, session }) => {
        console.log(
          "[Socket] matchedUser received (ChatLayout)",
          session.userId,
        )
        setMatchedData({ data, session })
      })

      socket.current.emit("addUser", currentUser.uid)
      setLoad(true)

      socket.current.on("getSession", ({ isRecover, session, chatRoom, remainingTime }) => {
        console.log(`[Socket:Session] getSession received, isRecover=${isRecover}, phase=${session?.phase}`)

        if (isRecover && chatRoom) {
          console.log("[Socket:Session] Recovering chat room:", chatRoom._id)
          if (remainingTime != null) {
            chatRoom.remainingTime = remainingTime
          }
          setCurrentChat(chatRoom)
          setChatRooms([chatRoom])
        } else if (isRecover && session?.phase === "matched" && session.currentI === 0) {
          console.log("[Socket:Session] Recovering matched state, auto-starting round 0")
          socket.current.emit("startRound", { userId: currentUser.uid })
        }

        setCursession(session)
        setLoad(false)
      })

      socket.current.on("sessionUpdate", ({ session }) => {
        console.log(
          "[Socket:Session] sessionUpdate received:",
          session.currentI,
        )
        setCursession(session)
        // Round-ended state is derived from session.phase; no need to
        // mutate currentChat.isEnd here. See AllUsers/ChatRoom.
      })
    }

    getSocket()
  }, [currentUser.uid])

  useEffect(() => {
    const fetchData = async () => {
      const res = await getAllUsers()
      SetUsers(res)
    }

    fetchData()
  }, [])

  useEffect(() => {
    setFilteredUsers(users)
    setFilteredRooms(chatRooms)
  }, [users, chatRooms])

  useEffect(() => {
    if (isContact) {
      setFilteredUsers([])
    } else {
      setFilteredRooms([])
    }
  }, [isContact])

  const handleChatChange = (chat) => {
    if (!chat || !cursession) return
    const index = cursession.currentI
    const chatType = cursession.types?.[index]
    chat.index = index
    chat.chatType = chatType
    setCurrentChat(chat)
  }

  useEffect(() => {
    const ping = () => {
      socket.current.emit("ping", { userId: currentUser })
      setTimeout(ping, 40000)
    }
    setTimeout(ping, 40000)
  }, [])

  const handleEndChatRoom = useCallback(async () => {
    setChatRooms([])
  }, [])

  return (
    <div className="container mx-auto">
      <div className="min-w-full bg-white border-x border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700 rounded lg:grid lg:grid-cols-3">
        <div className="bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-700 lg:col-span-1">
          {load && (
            <div id="load-mask">
              <span id="load-alert" className="dark:text-white">
                loading user information...
              </span>
            </div>
          )}
          <AllUsers
            chatRooms={searchQuery !== "" ? filteredRooms : chatRooms}
            currentSession={cursession}
            currentChat={currentChat}
            setCurrentSession={setCursession}
            setCurrentChat={setCurrentChat}
            currentUser={currentUser}
            changeChat={handleChatChange}
            socket={socket}
            matchedData={matchedData}
            setMatchedData={setMatchedData}
          />
        </div>

        {currentChat !== null ? (
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

      <SurveyReminderPopup
        open={showSurveyReminder}
        onClose={() => setSurveyReminderDismissedKey(surveyReminderKey)}
        isCompleted={cursession?.phase === "completed"}
      />
    </div>
  )
}
