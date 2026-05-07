import handleAddUser from "./handlers/addUser.js"
import handleDisconnect from "./handlers/disconnect.js"
import handleMatchUser from "./handlers/matchUser.js"
import handleStartRound from "./handlers/startRound.js"
import handleSendMessage from "./handlers/sendMessage.js"
import handleReady from "./handlers/ready.js"
import handleCheckRoundEnd from "./handlers/checkRoundEnd.js"
import handlePing from "./handlers/ping.js"
import { print_log } from "../service/utils.js"

// ─── Per-user rate limiter ────────────────────────────────────────────────────
const RATE_LIMITS = {
  sendMessage: { maxEvents: 20, windowMs: 10_000 },
  matchUser: { maxEvents: 5, windowMs: 10_000 },
  startRound: { maxEvents: 3, windowMs: 10_000 },
  ready: { maxEvents: 3, windowMs: 10_000 },
}
const rateLimitCounters = new Map() // userId → { eventName → [timestamps] }

function isRateLimited(userId, eventName) {
  const limit = RATE_LIMITS[eventName]
  if (!limit) return false

  const now = Date.now()
  if (!rateLimitCounters.has(userId)) rateLimitCounters.set(userId, {})
  const userCounters = rateLimitCounters.get(userId)
  if (!userCounters[eventName]) userCounters[eventName] = []

  // Drop timestamps outside the sliding window
  userCounters[eventName] = userCounters[eventName].filter(
    (ts) => now - ts < limit.windowMs,
  )

  if (userCounters[eventName].length >= limit.maxEvents) {
    print_log(`[RateLimit] ${userId} exceeded limit on "${eventName}"`, 2)
    return true
  }

  userCounters[eventName].push(now)
  return false
}

export default function setupSocket(io) {
  io.on("connection", (socket) => {
    socket.on("addUser", (userId) => handleAddUser(socket, userId))
    socket.on("disconnect", () => {
      // Clean up rate limit counters on disconnect to avoid memory growth
      const userId = [...global.onlineUsers.entries()].find(
        ([, sid]) => sid === socket.id,
      )?.[0]
      if (userId) rateLimitCounters.delete(userId)
      handleDisconnect(socket)
    })
    socket.on("matchUser", (data) => {
      if (isRateLimited(data?.userId, "matchUser")) return
      handleMatchUser(socket, data)
    })
    socket.on("startRound", (data) => {
      if (isRateLimited(data?.userId, "startRound")) return
      handleStartRound(socket, data)
    })
    socket.on("sendMessage", (data) => {
      if (isRateLimited(data?.senderId, "sendMessage")) return
      handleSendMessage(socket, data)
    })
    socket.on("ready", (data) => {
      if (isRateLimited(data?.userId, "ready")) return
      handleReady(socket, data)
    })
    socket.on("checkRoundEnd", (data) => handleCheckRoundEnd(socket, data))
    socket.on("ping", (data) => handlePing(socket, data))
  })
}
