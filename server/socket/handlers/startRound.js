import {
  createChatRoomService,
  appendChatRoomService,
} from "../../service/chatRoom.js"
import { print_log } from "../../service/utils.js"
import { AI_UID, MATCH_CONDITION } from "../constants.js"
import { constResponses } from "../../config/constResponse.js"
import UserSession from "../../models/UserSession.js"

const readyForRound = new Map()
const DURATION_MS = (Number(process.env.REACT_APP_SESSION_TIME) || 240) * 1000

// Per-user lock to prevent concurrent startRound processing
const startRoundLocks = new Map()

export function removeFromReady(userId) {
  readyForRound.delete(userId)
}

export default async function handleStartRound(socket, { userId }) {
  print_log(`[StartRound] Received request from ${userId}`, 5)

  if (startRoundLocks.get(userId)) {
    print_log(`[StartRound] Already processing for ${userId}, ignoring duplicate`, 4)
    return
  }
  startRoundLocks.set(userId, true)

  try {
    await _handleStartRound(socket, userId)
  } catch (err) {
    print_log(`[StartRound] ERROR for ${userId}: ${err.message}`, 1)
  } finally {
    startRoundLocks.delete(userId)
  }
}

async function _handleStartRound(socket, userId) {
  const session = await UserSession.findOne({ userId })
  const io = socket.server

  if (!session || session.phase === "completed" || session.currentI >= 3) {
    print_log(`[StartRound] Invalid session for user: ${userId}`, 2)
    return
  }

  // Idempotency: once a ChatRoom exists for this round (either awaiting
  // "ready" in `ready_check` or already ticking in `in_round`), a
  // subsequent startRound click is a no-op.
  if (
    (session.phase === "ready_check" || session.phase === "in_round") &&
    session.currentChatRoomId
  ) {
    print_log(`[StartRound] Round already set up for ${userId} (phase=${session.phase}), skipping`, 4)
    return
  }

  // Human–human study: do not open solo CON/GPT rounds until a partner exists
  if (MATCH_CONDITION === "ALL" && !session.matchedUserId) {
    print_log(`[StartRound] Not paired yet for ${userId}`, 4)
    return
  }

  const curI = session.currentI
  const curType = session.types[curI]
  const curItem = session.items[curI]
  const curList = session.currentChatRoomListId
  const isHumanRound = curType === "HUM"

  print_log(
    `[StartRound] User ${userId} starting round ${curI} (${curType})`,
    5,
  )

  if (isHumanRound) {
    print_log(`[StartRound] HUM round`, 5)

    const otherUserId = session.matchedUserId
    if (!otherUserId) {
      print_log(`[StartRound] ERROR: No matched user for HUM round`, 1)
      return
    }

    // Mark this user as ready
    readyForRound.set(userId, curI)
    const otherReady = readyForRound.get(otherUserId) === curI

    if (!otherReady) {
      print_log(`[StartRound] Waiting for other user ${otherUserId}`, 4)
      return
    }

    const otherSession = await UserSession.findOne({ userId: otherUserId })
    if (!otherSession) {
      print_log(`[StartRound] ERROR: Other session not found for ${otherUserId}`, 1)
      return
    }

    let chatRoom = session.currentChatRoomId
    const isNewRoomNeeded =
      !chatRoom || session.phase === "round_ended" || session.currentI !== curI

    if (isNewRoomNeeded) {
      const newRoom = await createChatRoomService(
        [userId, otherUserId],
        curItem,
        curType,
        curList,
      )
      await appendChatRoomService(newRoom._id, curList)

      session.currentChatRoomId = newRoom._id.toString()
      // HUM: room exists, but the clock (and phase=in_round) only fire
      // when BOTH partners type "ready" — see ready.js HUM branch.
      session.phase = "ready_check"
      session.roundStartedAt = null
      await session.save()

      otherSession.currentChatRoomId = newRoom._id.toString()
      otherSession.phase = "ready_check"
      otherSession.roundStartedAt = null
      await otherSession.save()

      print_log(
        `[StartRound] New HUM room created for ${userId} & ${otherUserId}`,
        5,
      )
    } else {
      print_log(`[StartRound] Reusing existing HUM room for ${userId}`, 5)
    }

    const chatRoomPayload = {
      _id: session.currentChatRoomId,
      members: [userId, otherUserId],
      chatType: curType,
      index: curI,
      instruction: curItem,
      isEnd: false,
    }

    // Emit matchedUser for UI (room open); do NOT emit roundStarted until both humans ready
    io.to(userId).emit("matchedUser", {
      data: chatRoomPayload,
      index: curI,
      session: session.toObject(),
    })

    io.to(otherUserId).emit("matchedUser", {
      data: chatRoomPayload,
      index: curI,
      session: otherSession.toObject(),
    })

    readyForRound.delete(userId)
    readyForRound.delete(otherUserId)

    return
  }

  // Handle CON round
  if (curType === "CON") {
    const quality =
      Math.random() >= 0.66 ? "high" : Math.random() >= 0.5 ? "gpt" : "low"

    const allRes = constResponses[curItem]?.[quality]
    if (!Array.isArray(allRes)) {
      print_log(
        `[StartRound] WARNING: Missing replies for ${curItem} (${quality}). Using fallback`,
        2,
      )
      session.conMes = ["Sorry, I don't have a reply."]
    } else {
      session.conMes = [...allRes].sort(() => Math.random() - 0.5)
    }
  }

  // Handle CON and GPT (separate rooms)
  const members = curType === "GPT" ? [userId, AI_UID] : [userId]

  const newRoom = await createChatRoomService(members, curItem, curType, curList)
  await appendChatRoomService(newRoom._id, curList)

  session.currentChatRoomId = newRoom._id.toString()
  // CON/GPT: room exists, clock + phase=in_round flip in ready.js after
  // the user types "ready".
  session.phase = "ready_check"
  session.roundStartedAt = null
  await session.save()

  chatMessage.set(userId, [{ text: curItem, sender: 0, replied: true }])
  not_ai_replied_first_map.set(userId, false)

  const chatRoomPayload = {
    ...newRoom.toObject(),
    chatType: curType,
    index: curI,
    instruction: curItem,
    isEnd: false,
  }

  // Emit matchedUser for UI; roundStarted is emitted from ready.js after "ready"
  io.to(userId).emit("matchedUser", {
    data: chatRoomPayload,
    index: curI,
    session: session.toObject(),
  })

  print_log(`[StartRound] ${curType} room created for ${userId}`, 5)
}
