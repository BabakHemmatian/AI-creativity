import {
  createChatRoomService,
  appendChatRoomService,
  createChatRoomListService,
} from "../../service/chatRoom.js"
import { constResponses } from "../../config/constResponse.js"
import { print_log } from "../../service/utils.js"
import { DEFAULT_SESSION, MATCH_CONDITION, AI_UID } from "../constants.js"

let waitingHumans = []
let lastItem = -1

const ITEMS = process.env.ITEMS.split(",")
const ITEMINDEX = [
  [1, 2, 0],
  [1, 0, 2],
  [2, 1, 0],
  [2, 0, 1],
  [0, 1, 2],
  [0, 2, 1],
]
const ORDERS = [
  [
    ["HUM", "CON", "GPT"],
    ["HUM", "GPT", "CON"],
  ],
  [
    ["HUM", "GPT", "CON"],
    ["HUM", "CON", "GPT"],
  ],
  [
    ["CON", "HUM", "GPT"],
    ["GPT", "HUM", "CON"],
  ],
  [
    ["GPT", "HUM", "CON"],
    ["CON", "HUM", "GPT"],
  ],
  [
    ["CON", "GPT", "HUM"],
    ["GPT", "CON", "HUM"],
  ],
  [
    ["GPT", "CON", "HUM"],
    ["CON", "GPT", "HUM"],
  ],
]
let lastOrder = -1

const getRandomOrders = () => {
  if (lastOrder === -1) {
    const idx = [0, 1][Math.floor(Math.random() * 2)]
    lastOrder = idx
    return ORDERS[idx][0]
  } else {
    const idx = lastOrder
    lastOrder = -1
    return ORDERS[idx][1]
  }
}

const getRandomItems = () => {
  const items = []
  const idx = lastItem === -1 ? Math.floor(Math.random() * 6) : lastItem
  lastItem = lastItem === -1 ? idx : -1
  ITEMINDEX[idx].forEach((i) => items.push(ITEMS[i]))
  return items
}

export default async function handleMatchUser(socket, { userId }) {
  let session = userSession.get(userId)
  if (!session || session.ended) {
    session = { ...DEFAULT_SESSION }
    userSession.set(userId, session)
  }

  if (session.ended) {
    const newOrder =
      MATCH_CONDITION === "ALL" ? getRandomOrders() : [MATCH_CONDITION]
    const newItems =
      MATCH_CONDITION === "ALL"
        ? getRandomItems()
        : [ITEMS[Math.floor(Math.random() * 3)]]
    const typeList = await createChatRoomListService(userId, newOrder)
    session = {
      ...session,
      ended: false,
      types: newOrder,
      items: newItems,
      currentI: 0,
      currentList: typeList._id,
    }
    userSession.set(userId, session)
  }

  const curI = session.currentI
  const curType = session.types[curI]
  const curItem = session.items[curI]
  const curList = session.currentList

  session.isMatching = true
  userSession.set(userId, session)

  const io = socket.server

  // HUMAN TYPE HANDLING
  if (curType === "HUM") {
    if (!waitingHumans.includes(userId)) waitingHumans.push(userId)
    print_log(`[Server:Match] ${userId} added to waitingHumans`, 5)

    await attemptHumanPairing(io, curItem, curType, curList)

    // fallback logic (only if still unmatched after 10s)
    setTimeout(async () => {
      if (waitingHumans.includes(userId)) {
        print_log(
          `[Server:Match] ${userId} fallback triggered after timeout`,
          5
        )
        waitingHumans = waitingHumans.filter((u) => u !== userId)
        // Retry same round, fallback to AI
        await handleFallback(
          userId,
          session,
          socket,
          curItem,
          curType,
          curList,
          curI
        )
      }
    }, 10000)
  } else {
    // AI round (CON/GPT)
    await handleAIRound(
      userId,
      session,
      socket,
      curItem,
      curType,
      curList,
      curI
    )
  }
}

async function attemptHumanPairing(io, curItem, curType, curList) {
  const validUsers = waitingHumans.filter(
    (uid) => onlineUsers.has(uid) && userSession.get(uid)?.isMatching
  )
  while (validUsers.length >= 2) {
    const [userA, userB] = [validUsers.shift(), validUsers.shift()]
    const sessionA = userSession.get(userA)
    const sessionB = userSession.get(userB)
    const newRoom = await createChatRoomService(
      [userA, userB],
      curItem,
      curType,
      curList
    )
    await appendChatRoomService(newRoom._id, curList)

    userSession.set(userA, {
      ...sessionA,
      currentChatRoom: newRoom,
      isMatching: false,
    })
    userSession.set(userB, {
      ...sessionB,
      currentChatRoom: newRoom,
      isMatching: false,
    })

    io.to(onlineUsers.get(userA)).emit("matchedUser", {
      data: newRoom,
      index: sessionA.currentI,
    })
    io.to(onlineUsers.get(userB)).emit("matchedUser", {
      data: newRoom,
      index: sessionB.currentI,
    })

    waitingHumans = waitingHumans.filter((id) => id !== userA && id !== userB)
    print_log(`[Server:Match] ${userA} + ${userB} matched`, 5)
  }
}

async function handleFallback(
  userId,
  session,
  socket,
  curItem,
  curType,
  curList,
  curI
) {
  const fallbackType = Math.random() < 0.5 ? "CON" : "GPT"

  const fallbackRoom = await createChatRoomService(
    [userId, AI_UID],
    curItem,
    fallbackType,
    curList
  )
  await appendChatRoomService(fallbackRoom._id, curList)

  if (fallbackType === "CON") {
    const quality =
      Math.random() >= 0.66 ? "high" : Math.random() >= 0.5 ? "gpt" : "low"
    session.quality = quality
    const curResponse = constResponses[curItem][quality]
    session.conMes = [...curResponse].sort(() => Math.random() - 0.5)
  }

  userSession.set(userId, {
    ...session,
    isMatching: false,
    currentChatRoom: fallbackRoom,
  })

  socket.emit("matchedUser", { data: fallbackRoom, index: curI })
  chatMessage.set(userId, [{ text: curItem, sender: 0, replied: true }])
}

async function handleAIRound(
  userId,
  session,
  socket,
  curItem,
  curType,
  curList,
  curI
) {
  const newRoom = await createChatRoomService(
    [userId, AI_UID],
    curItem,
    curType,
    curList
  )
  await appendChatRoomService(newRoom._id, curList)

  if (curType === "CON") {
    const quality =
      Math.random() >= 0.66 ? "high" : Math.random() >= 0.5 ? "gpt" : "low"
    session.quality = quality
    const curResponse = constResponses[curItem][quality]
    session.conMes = [...curResponse].sort(() => Math.random() - 0.5)
  }

  userSession.set(userId, {
    ...session,
    isMatching: false,
    currentChatRoom: newRoom,
  })

  socket.emit("matchedUser", { data: newRoom, index: curI })
  chatMessage.set(userId, [{ text: curItem, sender: 0, replied: true }])
}
