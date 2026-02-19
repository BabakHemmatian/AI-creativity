import {
  createChatRoomService,
  appendChatRoomService,
} from "../../service/chatRoom.js"
import { print_log } from "../../service/utils.js"
import { AI_UID } from "../constants.js"
import { constResponses } from "../../config/constResponse.js"

const readyForRound = new Map()

export function removeFromReady(userId) {
  readyForRound.delete(userId)
}

export default async function handleStartRound(socket, { userId }) {
  print_log(`[StartRound] Received request from ${userId}`, 5)
  const session = userSession.get(userId)
  const io = socket.server

  if (!session || session.ended || session.currentI >= 3) {
    print_log(`[StartRound] Invalid session for user: ${userId}`, 2)
    return
  }

  const curI = session.currentI
  const curType = session.types[curI]
  const curItem = session.items[curI]
  const curList = session.currentList
  const isHumanRound = curType === "HUM"

  if (session.roundStartedFor === curI) {
    print_log(`[StartRound] Round ${curI} already started for ${userId}`, 4)
    return
  }

  session.roundStartedFor = curI
  print_log(
    `[StartRound] User ${userId} starting round ${curI} (${curType})`,
    5,
  )
  if (isHumanRound) {
    print_log(`[StartRound] HUM round`, 5)

    const otherUserId = session.matchedUser
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

    let chatRoom = session.currentChatRoom
    const isNewRoomNeeded =
      !chatRoom || chatRoom.isEnd || chatRoom.index !== curI

    if (isNewRoomNeeded) {
      chatRoom = await createChatRoomService(
        [userId, otherUserId],
        curItem,
        curType,
        curList,
      )
      await appendChatRoomService(chatRoom._id, curList)

      session.currentChatRoom = chatRoom
      const otherSession = userSession.get(otherUserId)
      otherSession.currentChatRoom = chatRoom

      userSession.set(userId, session)
      userSession.set(otherUserId, otherSession)

      print_log(
        `[StartRound] New HUM room created for ${userId} & ${otherUserId}`,
        5,
      )
    } else {
      print_log(`[StartRound] Reusing existing HUM room for ${userId}`, 5)
    }

    const chatRoomPayload = {
      ...chatRoom.toObject(),
      members: [userId, otherUserId],
      chatType: curType,
      index: curI,
      instruction: curItem,
      isEnd: false,
    }

    io.to(onlineUsers.get(userId)).emit("matchedUser", {
      data: chatRoomPayload,
      index: curI,
      session,
    })

    io.to(onlineUsers.get(otherUserId)).emit("matchedUser", {
      data: chatRoomPayload,
      index: curI,
      session: userSession.get(otherUserId),
    })

    readyForRound.delete(userId)
    readyForRound.delete(otherUserId)

    return
  }

  if (curType === "CON" && !session.conMes) {
    const quality =
      Math.random() >= 0.66 ? "high" : Math.random() >= 0.5 ? "gpt" : "low"
    session.quality = quality

    const allRes = constResponses[curItem]?.[quality]
    if (!Array.isArray(allRes)) {
      print_log(
        `[startRound] WARNING: Missing replies for ${curItem} (${quality}). Using fallback`,
        2,
      )
      session.conMes = ["Sorry, I don't have a reply."]
    } else {
      session.conMes = [...allRes].sort(() => Math.random() - 0.5)
    }
  }

  const members = curType === "GPT" ? [userId, AI_UID] : [userId]

  const newRoom = await createChatRoomService(
    members,
    curItem,
    curType,
    curList,
  )

  await appendChatRoomService(newRoom._id, curList)

  const updatedSession = {
    ...session,
    currentChatRoom: newRoom,
  }
  userSession.set(userId, updatedSession)

  chatMessage.set(userId, [{ text: curItem, sender: 0, replied: true }])
  not_ai_replied_first_map.set(userId, false)

  const chatRoomPayload = {
    ...newRoom.toObject(),
    chatType: curType,
    index: curI,
    instruction: curItem,
    isEnd: false,
  }

  io.to(onlineUsers.get(userId)).emit("matchedUser", {
    data: chatRoomPayload,
    index: curI,
    session: updatedSession,
  })

  print_log(`[StartRound] AI room created for ${userId} in ${curType} round`, 5)
}
