import { DEFAULT_SESSION } from "../constants.js"
import { print_log } from "../../service/utils.js"
import { endChatRoomService } from "../../service/chatRoom.js"

export default async function handleTimeout(socket, { roomId, userId }) {
  let session = userSession.get(userId)
  if (!session) return print_log("timeout: session not found")

  const room = session.currentChatRoom
  if (!room) return print_log("timeout: room not found for user")

  const curI = session.currentI
  if (curI === session.types.length - 1) {
    session = { ...DEFAULT_SESSION, disconnecttime: new Date() }
  } else {
    session = { ...session, currentI: curI + 1, currentChatRoom: null }
  }

  userSession.set(userId, session)
  await endChatRoomService(roomId, false)

  // Notify the client of the updated session so buttons render correctly
  const socketId = onlineUsers.get(userId)
  if (socketId) {
    socket.server.to(socketId).emit("sessionUpdate", { session })
  }
}
