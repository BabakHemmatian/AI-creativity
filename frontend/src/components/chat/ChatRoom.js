import { useState, useEffect, useRef } from "react"

import Message from "./Message"
import Contact from "./Contact"
import ChatForm from "./ChatForm"
import { getMessagesOfChatRoom } from "../../services/ChatService"
import {
  parseInstruction,
  parseEndInstruction,
} from "../../utils/parseInstruction"

export default function ChatRoom({
  currentChat,
  currentUser,
  socket,
  handleEndChatRoom,
  currentSession,
}) {
  const DURATION_MS = (Number(process.env.REACT_APP_SESSION_TIME) || 240) * 1000
  const [messages, setMessages] = useState([])
  const [incomingMessage, setIncomingMessage] = useState(null)
  const [ready, setReady] = useState(0)
  const [prevAI, setPrevAI] = useState(false)
  const [change, setChange] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scratchpad, setScratchpad] = useState("")

  const [countdown, setCountdown] = useState(Math.ceil(DURATION_MS / 1000))

  const intervalRef = useRef(null)
  const currentId = useRef(String(currentChat._id))
  const currentChatRef = useRef(currentChat)
  const scrollRef = useRef()

  useEffect(() => {
    console.log("[ChatRoom] currentChat updated:", currentChat)

    currentChatRef.current = currentChat
    currentId.current = String(currentChat._id)

    setScratchpad("")
    setMessages([])
    setCountdown(Math.ceil(DURATION_MS / 1000))
    clearInterval(intervalRef.current)
    setIsProcessing(false)

    if (prevAI) setChange(true)

    // On recovery (or reload), fetch existing messages from DB
    const roomId = String(currentChat._id)
    getMessagesOfChatRoom(roomId).then((dbMessages) => {
      if (roomId !== currentId.current) return
      if (dbMessages && dbMessages.length > 0) {
        const formatted = dbMessages.map((m) => ({
          sender: m.sender,
          senderId: m.sender,
          message: m.message ?? m.text ?? "",
          roomId: String(m.chatRoomId ?? roomId),
          createdAt: m.createdAt,
        }))
        setMessages(formatted)
        setReady(3)
      } else {
        setReady(0)
      }
    }).catch(() => setReady(0))

    // Resume timer from remaining time if recovering mid-round
    if (currentChat.remainingTime != null && currentChat.remainingTime > 0) {
      const endTime = Date.now() + currentChat.remainingTime
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        const remaining = endTime - Date.now()
        if (remaining <= 0) {
          clearInterval(intervalRef.current)
          socket.current.emit("checkRoundEnd", { userId: currentUser.uid })
          setCountdown(0)
        } else {
          setCountdown(Math.ceil(remaining / 1000))
        }
      }, 500)
    }
  }, [currentChat._id])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const sock = socket.current
    if (!sock) return

    sock.on("getMessage", (data) => {
      console.log("getMessage: received")

      if (String(data.roomId) === String(currentId.current)) {
        setIncomingMessage({
          senderId: data.senderId,
          sender: data.senderId,
          message: data.message,
          roomId: data.roomId != null ? String(data.roomId) : data.roomId,
          createdAt: data.createdAt,
        })

        if (["GPT", "CON"].includes(currentChatRef.current.chatType)) {
          setIsProcessing(false)
        }
      }
    })

    sock.on("userReady", (data) => {
      console.log("userReady: received from", data.senderId)

      setReady((prev) => prev | (data.senderId === currentUser.uid ? 2 : 1))
      setIncomingMessage({
        senderId: data.senderId,
        sender: data.senderId,
        message: "ready",
        roomId: currentId.current,
      })
    })

    sock.on("roundStarted", ({ expectedEndTime }) => {
      console.log("roundStarted received, expectedEndTime:", expectedEndTime)
      const endTime = expectedEndTime
      clearInterval(intervalRef.current)

      intervalRef.current = setInterval(() => {
        const remaining = endTime - Date.now()

        if (remaining <= 0) {
          clearInterval(intervalRef.current)
          // Round should be over; ask server to confirm
          socket.current.emit("checkRoundEnd", { userId: currentUser.uid })
          setCountdown(0)
        } else {
          setCountdown(Math.ceil(remaining / 1000))
        }
      }, 500)
    })

    sock.on("refresh", () => {
      alert(
        "The co-player's connection to the server was severed. Please refresh this page to start this session again. We apologize for the inconvenience.",
      )
    })

    sock.on("sessionUpdate", ({ session }) => {
      console.log("[sessionUpdate]", session)
      // Mark chat as ended so UI updates
      if (currentChatRef.current) {
        currentChatRef.current.isEnd = true
      }
    })

    return () => {
      sock.off("getMessage")
      sock.off("userReady")
      sock.off("roundStarted")
      sock.off("refresh")
      sock.off("sessionUpdate")
      clearInterval(intervalRef.current)
    }
  }, [socket, currentUser.uid, handleEndChatRoom])

  useEffect(() => {
    incomingMessage && setMessages((prev) => [...prev, incomingMessage])
  }, [incomingMessage])

  useEffect(() => {
    if (currentChat.chatType === "GPT" && messages.length > 0) {
      const lastMsg = messages[messages.length - 1]

      if (
        lastMsg.senderId === "GPT" &&
        lastMsg.message.trim().toLowerCase() === "ready"
      ) {
        setIsProcessing(false)
      }
    }
  }, [messages, currentChat.chatType])

  const handleFormSubmit = async (message) => {
    console.log(`HandleFormSubmit: ${message}`)

    if (currentChat.chatType === "GPT" && isProcessing) return
    if (currentChat.chatType === "GPT") setIsProcessing(true)

    if (message === "ready" && ready !== 3) {
      setReady((prev) => prev | 2)
      setMessages([
        ...messages,
        {
          roomId: currentId.current,
          sender: currentUser.uid,
          message: "ready",
        },
      ])

      socket.current.emit("ready", {
        chatRoom: currentChat,
        userId: currentUser.uid,
      })

      // CON/GPT/HUM: server emits roundStarted after ready (single countdown source)
    } else if (ready !== 3) {
      alert("please first type ready!")
    } else if (currentChat.isEnd) {
      alert("current chat room has ended, but you can match a new one")
    } else {
      const receiverId = currentChat.members.find(
        (member) => member !== currentUser.uid,
      )

      socket.current.emit("sendMessage", {
        senderId: currentUser.uid,
        receiverId,
        message,
        chatRoom: currentChat,
      })

      setMessages([
        ...messages,
        {
          roomId: currentId.current,
          sender: currentUser.uid,
          message,
        },
      ])
    }
  }

  return (
    <div className="lg:col-span-2 lg:block">
      <div className="w-full">
        <div className="p-3 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          {currentChat.chatType === "CON" ? (
            // CON: always text-only
            <div className="text-gray-800 dark:text-white font-semibold">
              Non-Interactive Agent
            </div>
          ) : currentChat.chatType === "HUM" &&
            currentChat.members.length === 1 ? (
            // HUM but not yet paired
            <div className="text-gray-800 dark:text-white font-semibold">
              Interactive Human Partner
            </div>
          ) : (
            // HUM OR GPT: show avatar + label via Contact
            <Contact chatRoom={currentChat} currentUser={currentUser} />
          )}
        </div>

        <div className="relative w-full p-6 overflow-y-auto h-[30rem] bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <ul className="space-y-2">
            <li>
              {parseInstruction(
                currentChat.index,
                currentChat.chatType,
                change,
              )}
            </li>

            <li className="dark:text-white" style={{ fontWeight: "bold" }}>
              <div>
                {ready === 3 &&
                  `The object you will be coming up with creative uses for is: ${currentChat.instruction}`}
              </div>
            </li>

            {messages
              .filter(
                (mess) =>
                  String(mess.roomId ?? mess.chatRoomId ?? "") ===
                  String(currentId.current),
              )
              .map((message, index) => (
                <div key={index} ref={scrollRef}>
                  <Message message={message} self={currentUser.uid} />
                </div>
              ))}

            <li className="dark:text-white" style={{ fontWeight: "bold" }}>
              {`This chat room will end in ${countdown} seconds`}
            </li>

            <li className="dark:text-white" style={{ fontWeight: "bold" }}>
              {countdown === 0 && parseEndInstruction(currentChat.index)}
            </li>
          </ul>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Scratchpad (private, not sent to chat)
          </label>
          <textarea
            value={scratchpad}
            onChange={(e) => setScratchpad(e.target.value)}
            placeholder="You can organize ideas here..."
            className="w-full p-1 text-sm rounded-md dark:bg-gray-800 dark:text-gray-300"
            rows={4}
          />
        </div>

        <ChatForm
          handleFormSubmit={handleFormSubmit}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  )
}
