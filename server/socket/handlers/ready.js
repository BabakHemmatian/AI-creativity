import { print_log } from "../../service/utils.js"
import replyMessage from "../replyMessage.js"
import { AI_UID } from "../constants.js"
import { randSubAdd } from "../helpers.js"

let WAIT_TIME = process.env.WAIT_TIME || 5
let WAIT_TIME_DIFF = process.env.WAIT_TIME_DIFF || 2

export default function handleReady(socket, { chatRoom, userId }) {
  const curType = chatRoom.chatType
  const curId = chatRoom._id.toString()

  if (curType !== "HUM") {
    let multiplier = 1000
    if (curType === "GPT") {
      WAIT_TIME = 12
      WAIT_TIME_DIFF = 1
      multiplier = 100
    }

    socket.emit("userReady", { senderId: AI_UID })

    setTimeout(async function chatLoop() {
      const session = userSession.get(userId)
      const room = session?.currentChatRoom

      if (room && room._id.toString() === curId) {
        await replyMessage(socket, userId)
        setTimeout(
          chatLoop,
          (WAIT_TIME - randSubAdd(WAIT_TIME, WAIT_TIME_DIFF)) * multiplier
        )
      } else {
        not_ai_replied_first_map.set(userId, false)
        print_log(`AI reply ended for ${userId}`, 1)
      }
    }, (WAIT_TIME - randSubAdd(WAIT_TIME, WAIT_TIME_DIFF)) * multiplier)
  } else {
    let otherUser = chatRoom.members.find((m) => m !== userId)
    const otherSocket = onlineUsers.get(otherUser)
    socket.to(otherSocket).emit("userReady", { senderId: userId })
  }
}
