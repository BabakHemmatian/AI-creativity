import { print_log } from "../../service/utils.js"
import { getKey } from "../helpers.js"
import { removeFromWaiting } from "./matchUser.js"
import { removeFromReady } from "./startRound.js"
import UserSession from "../../models/UserSession.js"

export default async function handleDisconnect(socket) {
  const userId = getKey(onlineUsers, socket.id)
  const now = new Date()

  await removeFromWaiting(userId)
  removeFromReady(userId)

  onlineUsers.delete(userId)
  print_log(`logout: ${userId} ${now}`, 4)

  try {
    const session = await UserSession.findOne({ userId })
    if (!session) return

    if (recoverUser.has(userId)) {
      recoverUser.delete(userId)
    } else if (session.phase !== "completed") {
      const partnerId = session.matchedUserId
      if (partnerId && session.currentChatRoomId) {
        const partnerSocket = onlineUsers.get(partnerId)
        if (partnerSocket && session.types && session.types[session.currentI] === "HUM") {
          socket.to(partnerSocket).emit("refresh")
          recoverUser.add(partnerId)
        }
      }
    }

    session.disconnecttime = now
    await session.save()
  } catch (err) {
    print_log("disconnect: throws an error")
    print_log(err)
  }
}
