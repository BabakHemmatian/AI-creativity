import handleAddUser from "./handlers/addUser.js"
import handleDisconnect from "./handlers/disconnect.js"
import handleMatchUser from "./handlers/matchUser.js"
import handleStartRound from "./handlers/startRound.js"
import handleSendMessage from "./handlers/sendMessage.js"
import handleReady from "./handlers/ready.js"
import handleTimeout from "./handlers/timeout.js"
import handlePing from "./handlers/ping.js"

export default function setupSocket(io) {
  io.on("connection", (socket) => {
    socket.on("addUser", (userId) => handleAddUser(socket, userId))
    socket.on("disconnect", () => handleDisconnect(socket))
    socket.on("matchUser", (data) => handleMatchUser(socket, data))
    socket.on("startRound", (data) => handleStartRound(socket, data))
    socket.on("sendMessage", (data) => handleSendMessage(socket, data))
    socket.on("ready", (data) => handleReady(socket, data))
    socket.on("timeout", (data) => handleTimeout(socket, data))
    socket.on("ping", (data) => handlePing(socket, data))
  })
}
