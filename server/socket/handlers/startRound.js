import {
  createChatRoomService,
  appendChatRoomService,
} from "../../service/chatRoom.js"
import { print_log } from "../../service/utils.js"
import { AI_UID } from "../constants.js"
import { constResponses } from "../../config/constResponse.js"
import UserSession from "../../models/UserSession.js"

const readyForRound = new Map()
const DURATION_MS = (Number(process.env.REACT_APP_SESSION_TIME) || 240) * 1000

export function removeFromReady(userId) {
  readyForRound.delete(userId)
}

export default async function handleStartRound(socket, { userId }) {
  print_log(`[StartRound] Received request from ${userId}`, 5)
  const session = await UserSession.findOne({ userId })
  const io = socket.server

  if (!session || session.phase === "completed" || session.currentI >= 3) {
    print_log(`[StartRound] Invalid session for user: ${userId}`, 2)
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
      session.phase = "in_round"
      session.roundStartedAt = new Date()
      await session.save()

      otherSession.currentChatRoomId = newRoom._id.toString()
      otherSession.phase = "in_round"
      otherSession.roundStartedAt = new Date()
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

    const roundEndTime = new Date(Date.now() + DURATION_MS)

    io.to(onlineUsers.get(userId)).emit("roundStarted", {
      roundId: session.currentChatRoomId,
      expectedEndTime: roundEndTime.getTime(),
      phase: "in_round",
      data: chatRoomPayload,
    })

    io.to(onlineUsers.get(otherUserId)).emit("roundStarted", {
      roundId: session.currentChatRoomId,
      expectedEndTime: roundEndTime.getTime(),
      phase: "in_round",
      data: chatRoomPayload,
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
  session.phase = "in_round"
  session.roundStartedAt = new Date()
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

  const roundEndTime = new Date(Date.now() + DURATION_MS)

  io.to(onlineUsers.get(userId)).emit("roundStarted", {
    roundId: newRoom._id.toString(),
    expectedEndTime: roundEndTime.getTime(),
    phase: "in_round",
    data: chatRoomPayload,
  })

  print_log(`[StartRound] ${curType} room created for ${userId}`, 5)
}
