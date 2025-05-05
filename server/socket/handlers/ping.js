import { print_log } from "../../service/utils.js"

export default function handlePing(socket, { userId }) {
  print_log("pong", 2)
  const socketId = onlineUsers.get(userId)
  if (socketId) socket.to(socketId).emit("pong")
}
