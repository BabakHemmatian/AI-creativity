import { print_log } from "../../service/utils.js"
import replyMessage from "../replyMessage.js"
import { AI_UID } from "../constants.js"
import UserSession from "../../models/UserSession.js"

const WAIT_TIME = Number(process.env.WAIT_TIME) || 5
const WAIT_TIME_DIFF = Number(process.env.WAIT_TIME_DIFF) || 2
const DURATION_MS = (Number(process.env.REACT_APP_SESSION_TIME) || 240) * 1000

function jitterMs(baseSecs, diffSecs, multiplier) {
  const delta =
    diffSecs > 0 ? Math.floor(Math.random() * (diffSecs * 2 + 1)) - diffSecs : 0
  const secs = Math.max(1, baseSecs + delta)
  return secs * multiplier
}

export default async function handleReady(socket, { chatRoom, userId }) {
  const curType = chatRoom.chatType
  const curId = String(chatRoom._id)

  if (curType !== "HUM") {
    let waitTime = WAIT_TIME
    let waitTimeDiff = WAIT_TIME_DIFF
    let multiplier = 1000
    if (curType === "GPT") {
      waitTime = 12
      waitTimeDiff = 1
      multiplier = 100
    } else if (curType === "CON") {
      waitTime = 13
      waitTimeDiff = WAIT_TIME_DIFF
      multiplier = 1000
    }

    const sess = await UserSession.findOne({ userId })
    if (
      !sess ||
      String(sess.currentChatRoomId) !== curId ||
      sess.phase !== "in_round"
    ) {
      print_log(`[Ready] ${curType} invalid session or room`, 2)
      return
    }
    if (sess.roundStartedAt) {
      print_log(`[Ready] ${curType} round clock already started`, 4)
      return
    }

    sess.roundStartedAt = new Date()
    await sess.save()

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

    setTimeout(
      async function chatLoop() {
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
          setTimeout(chatLoop, jitterMs(waitTime, waitTimeDiff, multiplier))
        } else {
          not_ai_replied_first_map.set(userId, false)
          print_log(`AI reply ended for ${userId}`, 1)
        }
      },
      jitterMs(waitTime, waitTimeDiff, multiplier),
    )
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

      const now = new Date()
      sessA.roundStartedAt = now
      sessB.roundStartedAt = now
      await sessA.save()
      await sessB.save()

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
