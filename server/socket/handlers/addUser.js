import { SESSION_TIME } from "../constants.js"
import { print_log } from "../../service/utils.js"
import UserSession from "../../models/UserSession.js"

export default async function handleAddUser(socket, userId) {
  print_log(`userId: ${userId}`)

  // Try to recover existing session from Mongo (not expired)
  let session = await UserSession.findOne({
    userId,
    expiresAt: { $gt: new Date() },
  })

  if (session) {
    print_log("recover session", 4)
    // Reset state for refresh
    not_ai_replied_first_map.set(userId, false)
    session.lastActivityAt = new Date()
    await session.save()
    socket.emit("getSession", { isRecover: true, session: session.toObject() })
  } else {
    // Create new session
    print_log("start new session", 4)
    session = new UserSession({
      userId,
      phase: "waiting",
      currentI: -1,
      types: [],
      items: [],
      matchedUserId: null,
      currentChatRoomId: null,
      currentChatRoomListId: null,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + SESSION_TIME * 1000),
      tags: [],
    })
    await session.save()
    socket.emit("getSession", { isRecover: false, session: session.toObject() })
  }

  onlineUsers.set(userId, socket.id)
  print_log(`login: ${userId}`, 4)
}
