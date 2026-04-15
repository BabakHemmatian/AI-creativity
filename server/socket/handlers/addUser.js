import { SESSION_TIME } from "../constants.js"
import { print_log } from "../../service/utils.js"
import UserSession from "../../models/UserSession.js"
import ChatRoom from "../../models/ChatRoom.js"

export default async function handleAddUser(socket, userId) {
  print_log(`userId: ${userId}`)

  try {
    await _handleAddUser(socket, userId)
  } catch (err) {
    print_log(`[AddUser] ERROR for ${userId}: ${err.message}`, 1)
  }
}

async function _handleAddUser(socket, userId) {
  let session = await UserSession.findOne({
    userId,
    expiresAt: { $gt: new Date() },
  })

  if (session && session.phase !== "waiting" && session.currentI >= 0) {
    print_log(`[AddUser] Recovering session for ${userId} (phase=${session.phase}, round=${session.currentI})`, 4)
    not_ai_replied_first_map.set(userId, false)
    session.lastActivityAt = new Date()
    await session.save()

    // Fetch the actual ChatRoom document so frontend can display it
    let chatRoom = null
    if (session.currentChatRoomId) {
      const room = await ChatRoom.findById(session.currentChatRoomId)
      if (room) {
        chatRoom = {
          ...room.toObject(),
          chatType: session.types[session.currentI],
          index: session.currentI,
          instruction: session.items[session.currentI],
        }
      }
    }

    const DURATION_MS = (Number(process.env.REACT_APP_SESSION_TIME) || 240) * 1000
    let remainingTime = null
    if (session.roundStartedAt) {
      const elapsed = Date.now() - session.roundStartedAt.getTime()
      remainingTime = Math.max(0, DURATION_MS - elapsed)
    }

    socket.emit("getSession", {
      isRecover: true,
      session: session.toObject(),
      chatRoom,
      remainingTime,
    })
  } else {
    if (!session) {
      print_log("[AddUser] Creating new session", 4)
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
    }
    socket.emit("getSession", { isRecover: false, session: session.toObject() })
  }

  onlineUsers.set(userId, socket.id)
  // Join a stable room so emits can use io.to(userId) (avoids stale socket.id in onlineUsers)
  socket.join(userId)
  print_log(`login: ${userId}`, 4)
}
