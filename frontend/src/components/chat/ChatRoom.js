import { useState, useEffect, useRef } from "react"
import {
  getMessagesOfChatRoom,
  sendMessage,
  endChatRoom,
} from "../../services/ChatService"

import Message from "./Message"
import Contact from "./Contact"
import ChatForm from "./ChatForm"
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
  const currentId = useRef(currentChat._id)
  const currentChatRef = useRef(currentChat)
  const scrollRef = useRef()

  useEffect(() => {
    console.log("[ChatRoom] currentChat updated:", currentChat)

    currentChatRef.current = currentChat
    currentId.current = currentChat._id

    setReady(0)
    setScratchpad("")
    setMessages([])
    setCountdown(Math.ceil(DURATION_MS / 1000))
    clearInterval(intervalRef.current)
    setIsProcessing(false)
    if (prevAI) setChange(true)

    // Only auto-start for round 0
    if (
      currentSession &&
      currentSession.currentI === 0 &&
      !currentChat.isEnd &&
      currentChat._id &&
      currentChat.chatType
    ) {
      console.log("[AutoStart] Emitting startRound for first round")
      socket.current.emit("startRound", { userId: currentUser.uid })
    }
  }, [currentChat._id])

  useEffect(() => {
    currentId.current = currentChat._id
    setReady(0)
    setMessages([])
    setCountdown(Math.ceil(DURATION_MS / 1000))
    clearInterval(intervalRef.current)
    if (prevAI) setChange(true)
  }, [currentChat._id])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const sock = socket.current
    if (!sock) return

    sock.on("getMessage", (data) => {
      console.log("getMessage: received")

      if (data.roomId === currentId.current) {
        setIncomingMessage({
          senderId: data.senderId,
          message: data.message,
          roomId: data.roomId,
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
        message: "ready",
        roomId: currentId.current,
      })
    })

    sock.on("startChatSession", ({ startTime }) => {
      console.log("startChatSession received:", startTime)
      const endTime = startTime + DURATION_MS
      clearInterval(intervalRef.current)

      intervalRef.current = setInterval(() => {
        const remaining = endTime - Date.now()
        if (remaining <= 0) {
          clearInterval(intervalRef.current)

          const roomId = currentChatRef.current._id
          const chatType = currentChatRef.current.chatType

          socket.current.emit("timeout", {
            roomId,
            userId: currentUser.uid,
          })

          handleEndChatRoom()
          currentChatRef.current.isEnd = true
          if (chatType !== "HUM") setPrevAI(true)
          setCountdown(0)
        } else {
          setCountdown(Math.ceil(remaining / 1000))
        }
      }, 500)
    })

    sock.on("refresh", () => {
      alert(
        "The co-player’s connection to the server was severed. Please refresh this page to start this session again. We apologize for the inconvenience.",
      )
    })

    return () => {
      sock.off("getMessage")
      sock.off("userReady")
      sock.off("startChatSession")
      sock.off("refresh")
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

      if (["GPT", "CON"].includes(currentChat.chatType)) {
        const endTime = Date.now() + DURATION_MS
        clearInterval(intervalRef.current)

        intervalRef.current = setInterval(() => {
          const remaining = endTime - Date.now()
          if (remaining <= 0) {
            clearInterval(intervalRef.current)

            const roomId = currentChatRef.current._id
            socket.current.emit("timeout", {
              roomId,
              userId: currentUser.uid,
            })

            handleEndChatRoom()
            currentChatRef.current.isEnd = true
            setPrevAI(true)
            setCountdown(0)
          } else {
            setCountdown(Math.ceil(remaining / 1000))
          }
        }, 500)
      }
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
              .filter((mess) => mess.roomId === currentId.current)
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
