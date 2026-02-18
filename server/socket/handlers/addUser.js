import { DEFAULT_SESSION, SESSION_TIME } from "../constants.js"
import { print_log } from "../../service/utils.js"

export default function handleAddUser(socket, userId) {
  print_log(`userId: ${userId}`)

  if (!userSession.has(userId)) {
    userSession.set(userId, { ...DEFAULT_SESSION })
  }

  const curTime = new Date()
  const session = userSession.get(userId)
  const timediff = (curTime - session.disconnecttime) / 1000

  if (!session.ended && timediff < SESSION_TIME) {
    print_log("recover session", 4)
    // Reset roundStartedFor and not_ai_replied_first_map on refresh
    session.roundStartedFor = -1
    not_ai_replied_first_map.set(userId, false)
    userSession.set(userId, session)
    socket.emit("getSession", { isRecover: true, session })
  } else if (!session.ended) {
    print_log("session time out, start new", 4)
    const newSession = { ...DEFAULT_SESSION }
    userSession.set(userId, newSession)
    socket.emit("getSession", { isRecover: false, session: newSession })
  } else {
    print_log("previous session ended, start new", 4)
    socket.emit("getSession", { isRecover: false, session })
  }

  onlineUsers.set(userId, socket.id)
  print_log(`login: ${userId}`, 4)
}
