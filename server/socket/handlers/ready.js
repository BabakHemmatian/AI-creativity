import { print_log } from "../../service/utils.js"
import replyMessage from "../replyMessage.js"
import { AI_UID } from "../constants.js"

export default function handleReady(socket, { chatRoom, userId }) {
  const curType = chatRoom.chatType
  const curId = chatRoom._id.toString()

  const getDelayMs = (type) => {
    if (type === "GPT") {
      const base = 12
      const jitter = Math.random() * 1
      return (base + jitter) * 100
    }
    if (type === "CON") {
      return 13 * 1000
    }
    const base = Number(process.env.WAIT_TIME) || 5
    return base * 1000
  }

  if (curType !== "HUM") {
    const delayMs = getDelayMs(curType)

    socket.emit("userReady", { senderId: AI_UID })

    setTimeout(async function chatLoop() {
      const session = userSession.get(userId)
      const room = session?.currentChatRoom

      if (room && room._id.toString() === curId) {
        await replyMessage(socket, userId)
        setTimeout(chatLoop, delayMs)
      } else {
        not_ai_replied_first_map.set(userId, false)
        print_log(`AI reply ended for ${userId}`, 1)
      }
    }, delayMs)
  } else {
    const roomId = chatRoom._id.toString()
    if (!global.readyMap) global.readyMap = new Map()
    if (!global.readyMap.has(roomId)) {
      global.readyMap.set(roomId, new Set())
    }

    const readySet = global.readyMap.get(roomId)
    readySet.add(userId)

    const otherUser = chatRoom.members.find((m) => m !== userId)
    const otherSocket = onlineUsers.get(otherUser)
    socket.to(otherSocket).emit("userReady", { senderId: userId })

    if (readySet.size === 2) {
      const now = Date.now()
      socket.emit("startChatSession", { startTime: now })
      socket.to(otherSocket).emit("startChatSession", { startTime: now })

      print_log(`[Server:Ready] Both users ready. Session started at ${now}`, 5)
      global.readyMap.delete(roomId)
    }
  }
}
