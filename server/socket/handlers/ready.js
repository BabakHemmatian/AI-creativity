import { print_log } from "../../service/utils.js"
import replyMessage from "../replyMessage.js"
import { AI_UID } from "../constants.js"

const WAIT_TIME = Number(process.env.WAIT_TIME) || 5
const WAIT_TIME_DIFF = Number(process.env.WAIT_TIME_DIFF) || 2

function jitterMs(baseSecs, diffSecs, multiplier) {
  const delta =
    diffSecs > 0 ? Math.floor(Math.random() * (diffSecs * 2 + 1)) - diffSecs : 0
  const secs = Math.max(1, baseSecs + delta)
  return secs * multiplier
}

export default function handleReady(socket, { chatRoom, userId }) {
  const curType = chatRoom.chatType
  const curId = chatRoom._id.toString()

  if (curType !== "HUM") {
    // Local constants per call — avoids shared state mutation across concurrent users
    let waitTime = WAIT_TIME
    let waitTimeDiff = WAIT_TIME_DIFF
    let multiplier = 1000
    if (curType === "GPT") {
      waitTime = 12
      waitTimeDiff = 1
      multiplier = 100
    } else if (curType === "CON") {
      waitTime = 13
      waitTimeDiff = WAIT_TIME_DIFF
      multiplier = 1000
    }

    socket.emit("userReady", { senderId: AI_UID })

    setTimeout(
      async function chatLoop() {
        const session = userSession.get(userId)
        const room = session?.currentChatRoom

        if (room && room._id.toString() === curId) {
          try {
            await replyMessage(socket, userId)
          } catch (err) {
            print_log(`chatLoop: AI reply failed for ${userId}`, -1)
            print_log(err)
            socket.emit("aiError", {
              message: "AI response failed. Retrying shortly.",
            })
          }
          setTimeout(chatLoop, jitterMs(waitTime, waitTimeDiff, multiplier))
        } else {
          not_ai_replied_first_map.set(userId, false)
          print_log(`AI reply ended for ${userId}`, 1)
        }
      },
      jitterMs(waitTime, waitTimeDiff, multiplier),
    )
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
