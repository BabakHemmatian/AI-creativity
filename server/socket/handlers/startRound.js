// handlers/startRound.js

import {
  createChatRoomService,
  appendChatRoomService,
} from "../../service/chatRoom.js"
import { print_log } from "../../service/utils.js"
import { AI_UID } from "../constants.js"

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
    5
  )
  if (isHumanRound) {
    print_log(`[StartRound] HUM round - no new room needed`, 5)

    const existingRoom = session.currentChatRoom
    if (!existingRoom) {
      print_log(`[StartRound] ERROR: No existing room found for HUM round`, 1)
      return
    }

    existingRoom.chatType = curType
    existingRoom.index = curI

    userSession.set(userId, session)

    io.to(onlineUsers.get(userId)).emit("matchedUser", {
      data: existingRoom,
      index: curI,
      session,
    })
    return
  }

  // ✅ AI round: create room with dummy AI partner
  const members = curType === "GPT" ? [userId, AI_UID] : [userId]

  const newRoom = await createChatRoomService(
    members,
    curItem,
    curType,
    curList
  )

  await appendChatRoomService(newRoom._id, curList)

  const updatedSession = {
    ...session,
    currentChatRoom: newRoom,
  }
  userSession.set(userId, updatedSession)

  chatMessage.set(userId, [{ text: curItem, sender: 0, replied: true }])

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
