import { print_log } from "../../service/utils.js"
import { getKey } from "../helpers.js"
import { removeFromWaiting } from "./matchUser.js"
import { removeFromReady } from "./startRound.js"

export default function handleDisconnect(socket) {
  const userId = getKey(onlineUsers, socket.id)
  const session = userSession.get(userId)
  const now = new Date()

  removeFromWaiting(userId)
  removeFromReady(userId)

  onlineUsers.delete(userId)
  print_log(`logout: ${userId} ${now}`, 4)

  try {
    if (!session) return

    if (recoverUser.has(userId)) {
      recoverUser.delete(userId)
    } else if (!session.ended) {
      const partnerId = session.matchedUser
      if (partnerId) {
        const partnerSession = userSession.get(partnerId)
        const partnerSocket = onlineUsers.get(partnerId)
        const room = partnerSession?.currentChatRoom

        if (room?.chatType === "HUM") {
          socket.to(partnerSocket).emit("refresh")
          recoverUser.add(partnerId)
        }
      }
    }

    session.disconnecttime = now
    userSession.set(userId, session)
  } catch (err) {
    print_log("disconnect: throws an error")
    print_log(err)
  }
}
