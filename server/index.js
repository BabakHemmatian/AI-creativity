import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { Server } from "socket.io"

import "./config/mongo.js"

import { VerifyToken, VerifySocketToken } from "./middlewares/VerifyToken.js"
import chatRoomRoutes from "./routes/chatRoom.js"
import chatMessageRoutes from "./routes/chatMessage.js"
import userRoutes from "./routes/user.js"

import setupSocket from "./socket/index.js"

import { print_log } from "./service/utils.js"

// Load env variables
dotenv.config()

const app = express()

/** Middleware */
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use("/api/room", chatRoomRoutes)
app.use("/api/message", chatMessageRoutes)
app.use("/api/user", userRoutes)
app.use(VerifyToken)

/** Server Configuration */
const PORT = process.env.PORT || 8080
const server = app.listen(PORT, () => {
  print_log(`Server listening on port ${PORT}`)
})

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
})
io.use(VerifySocketToken)

/** Global Maps */
global.onlineUsers = new Map()
global.userToRoom = new Map()
global.chatMessage = new Map()
global.userToRes = new Map()
global.userToTypes = new Map()
global.userToList = new Map()
global.userSession = new Map()
global.recoverUser = new Set()
global.not_ai_replied_first_map = new Map()

/** Start Socket Event Binding */

setupSocket(io)
