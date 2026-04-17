import { print_log } from "../../service/utils.js"
import { getKey } from "../helpers.js"
import { removeFromWaiting } from "./matchUser.js"
import { removeFromReady } from "./startRound.js"
import { cancelChatLoop } from "./ready.js"
import { endChatRoomService } from "../../service/chatRoom.js"
import UserSession from "../../models/UserSession.js"

export default async function handleDisconnect(socket) {
  try {
    const userId = getKey(onlineUsers, socket.id)

    if (!userId) {
      print_log("[Disconnect] Could not resolve userId for socket, skipping", 2)
      return
    }

    const now = new Date()

    try { await removeFromWaiting(userId) } catch (e) {
      print_log(`[Disconnect] removeFromWaiting error: ${e.message}`, 1)
    }
    removeFromReady(userId)
    cancelChatLoop(userId)

    onlineUsers.delete(userId)
    print_log(`logout: ${userId} ${now}`, 4)

    const session = await UserSession.findOne({ userId })
    if (!session) return

    // Clean up readyMap entries for HUM rooms this user was in
    if (global.readyMap) {
      for (const [roomId, readySet] of global.readyMap.entries()) {
        if (readySet.has(userId)) {
          readySet.delete(userId)
          if (readySet.size === 0) global.readyMap.delete(roomId)
        }
      }
    }

    // Close the current ChatRoom as an early end so the DB reflects abandonment.
    // Recovery path (`recoverUser`) still handles partner refresh below; we close
    // the room regardless because the ChatRoom._id won't be reused on recovery.
    const isMidRound =
      session.currentChatRoomId &&
      session.phase !== "completed" &&
      session.phase !== "round_ended" &&
      session.phase !== "waiting"
    if (isMidRound) {
      try {
        await endChatRoomService(session.currentChatRoomId, true)
        print_log(
          `[Disconnect] Marked room ${session.currentChatRoomId} as earlyEnd for ${userId}`,
          4,
        )
      } catch (e) {
        print_log(`[Disconnect] endChatRoomService error: ${e.message}`, 1)
      }
    }

    if (recoverUser.has(userId)) {
      recoverUser.delete(userId)
    } else if (session.phase !== "completed") {
      const partnerId = session.matchedUserId
      if (partnerId && session.currentChatRoomId) {
        if (
          onlineUsers.has(partnerId) &&
          session.types &&
          session.types[session.currentI] === "HUM"
        ) {
          socket.server.to(partnerId).emit("refresh")
          recoverUser.add(partnerId)
        }
      }
    }

    session.disconnecttime = now
    await session.save()
  } catch (err) {
    print_log(`[Disconnect] ERROR: ${err.message}`, 1)
  }
}
