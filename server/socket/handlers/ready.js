import { print_log } from "../../service/utils.js"
import replyMessage from "../replyMessage.js"
import { AI_UID } from "../constants.js"
import UserSession from "../../models/UserSession.js"
import { setChatRoomStartedAtService } from "../../service/chatRoom.js"

const WAIT_TIME = Number(process.env.WAIT_TIME) || 5
const WAIT_TIME_DIFF = Number(process.env.WAIT_TIME_DIFF) || 2
const DURATION_MS = (Number(process.env.REACT_APP_SESSION_TIME) || 240) * 1000

function jitterMs(baseSecs, diffSecs, multiplier) {
  const delta =
    diffSecs > 0 ? Math.floor(Math.random() * (diffSecs * 2 + 1)) - diffSecs : 0
  const secs = Math.max(1, baseSecs + delta)
  return secs * multiplier
}

const readyLocks = new Map()
const activeChatLoops = new Map()

export function cancelChatLoop(userId) {
  const timerId = activeChatLoops.get(userId)
  if (timerId) {
    clearTimeout(timerId)
    activeChatLoops.delete(userId)
    print_log(`[Ready] Cancelled chatLoop timer for ${userId}`, 4)
  }
}

function cadenceFor(curType) {
  if (curType === "GPT") {
    return { waitTime: 12, waitTimeDiff: 1, multiplier: 100 }
  }
  if (curType === "CON") {
    return { waitTime: 13, waitTimeDiff: WAIT_TIME_DIFF, multiplier: 1000 }
  }
  return { waitTime: WAIT_TIME, waitTimeDiff: WAIT_TIME_DIFF, multiplier: 1000 }
}

/**
 * Start (or resume) the AI reply loop for a non-HUM room. Safe to call
 * even if a loop is already active for this user — it will replace the
 * existing timer rather than double-firing.
 *
 * Callers:
 *  - `_handleReady`: initial start after the user types "ready".
 *  - `_handleAddUser` (recovery): resume after a transient disconnect so
 *    the AI continues to reply in the same GPT/CON round.
 */
export function startChatLoop(socket, userId, curType, curId) {
  const { waitTime, waitTimeDiff, multiplier } = cadenceFor(curType)

  // Replace any stale timer so we never end up with two concurrent loops
  // for the same user (e.g. recover races with a still-running loop).
  cancelChatLoop(userId)

  const scheduleLoop = (fn, delay) => {
    const id = setTimeout(fn, delay)
    activeChatLoops.set(userId, id)
    return id
  }

  scheduleLoop(async function chatLoop() {
    const session = await UserSession.findOne({ userId })
    const roomId = session?.currentChatRoomId

    if (session && roomId === curId && session.phase === "in_round") {
      try {
        await replyMessage(socket, userId, session)
      } catch (err) {
        print_log(`chatLoop: AI reply failed for ${userId}`, -1)
        print_log(err)
        socket.emit("aiError", {
          message: "AI response failed. Retrying shortly.",
        })
      }
      scheduleLoop(chatLoop, jitterMs(waitTime, waitTimeDiff, multiplier))
    } else {
      activeChatLoops.delete(userId)
      not_ai_replied_first_map.set(userId, false)
      print_log(`AI reply ended for ${userId}`, 1)
    }
  }, jitterMs(waitTime, waitTimeDiff, multiplier))
}

export default async function handleReady(socket, { chatRoom, userId }) {
  if (readyLocks.get(userId)) {
    print_log(`[Ready] Already processing for ${userId}, ignoring duplicate`, 4)
    return
  }
  readyLocks.set(userId, true)

  try {
    await _handleReady(socket, chatRoom, userId)
  } catch (err) {
    print_log(`[Ready] ERROR for ${userId}: ${err.message}`, 1)
  } finally {
    readyLocks.delete(userId)
  }
}

async function _handleReady(socket, chatRoom, userId) {
  const curType = chatRoom.chatType
  const curId = String(chatRoom._id)

  if (curType !== "HUM") {
    const sess = await UserSession.findOne({ userId })
    if (
      !sess ||
      String(sess.currentChatRoomId) !== curId ||
      sess.phase !== "ready_check"
    ) {
      print_log(
        `[Ready] ${curType} invalid session/room/phase (phase=${sess?.phase})`,
        2,
      )
      return
    }

    // Flip ready_check → in_round atomically with setting roundStartedAt.
    // Past this point, `phase === "in_round"` ↔ "clock is ticking".
    const startedAt = new Date()
    sess.phase = "in_round"
    sess.roundStartedAt = startedAt
    await sess.save()
    await setChatRoomStartedAtService(curId, startedAt)

    const io = socket.server
    const expectedEndTime = Date.now() + DURATION_MS
    const curI = sess.currentI
    io.to(userId).emit("roundStarted", {
      roundId: curId,
      expectedEndTime,
      phase: "in_round",
      data: {
        _id: curId,
        members: chatRoom.members,
        chatType: curType,
        index: curI,
        instruction: sess.items[curI],
        isEnd: false,
      },
    })

    socket.emit("userReady", { senderId: AI_UID })

    startChatLoop(socket, userId, curType, curId)
  } else {
    const roomId = String(chatRoom._id)
    if (!global.readyMap) global.readyMap = new Map()
    if (!global.readyMap.has(roomId)) {
      global.readyMap.set(roomId, new Set())
    }

    const otherUser = chatRoom.members?.find((m) => m !== userId)
    if (!otherUser) {
      print_log(`[Ready] HUM chatRoom missing counterpart for ${userId}`, 2)
      return
    }
    const io = socket.server
    if (!onlineUsers.has(otherUser)) {
      print_log(`[Ready] HUM partner ${otherUser} has no socket (offline?)`, 2)
      return
    }

    const readySet = global.readyMap.get(roomId)
    readySet.add(userId)

    io.to(otherUser).emit("userReady", { senderId: userId })

    if (readySet.size === 2) {
      const [uidA, uidB] = [...readySet]
      global.readyMap.delete(roomId)

      const [sessA, sessB] = await Promise.all([
        UserSession.findOne({ userId: uidA }),
        UserSession.findOne({ userId: uidB }),
      ])
      if (!sessA || !sessB) {
        print_log("[Ready] HUM missing session when both ready", 1)
        return
      }

      // Flip both partners from ready_check → in_round in the same save
      // pass that stamps the clock. This is the moment a HUM round
      // "actually starts".
      const now = new Date()
      sessA.phase = "in_round"
      sessB.phase = "in_round"
      sessA.roundStartedAt = now
      sessB.roundStartedAt = now
      await sessA.save()
      await sessB.save()
      await setChatRoomStartedAtService(roomId, now)

      const curI = sessA.currentI
      const instruction = sessA.items[curI]
      const payload = {
        _id: curId,
        members: chatRoom.members?.length
          ? chatRoom.members
          : [uidA, uidB],
        chatType: "HUM",
        index: curI,
        instruction,
        isEnd: false,
      }

      const expectedEndTime = Date.now() + DURATION_MS
      const emitSessionStart = (uid) => {
        io.to(uid).emit("startChatSession", { startTime: now.getTime() })
        io.to(uid).emit("roundStarted", {
          roundId: curId,
          expectedEndTime,
          phase: "in_round",
          data: payload,
        })
      }

      emitSessionStart(uidA)
      emitSessionStart(uidB)

      print_log(`[Server:Ready] HUM both ready; round clock started at ${now.toISOString()}`, 5)
    }
  }
}
