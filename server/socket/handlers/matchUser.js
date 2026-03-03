import {
  createChatRoomService,
  appendChatRoomService,
  createChatRoomListService,
} from "../../service/chatRoom.js"
import { constResponses } from "../../config/constResponse.js"
import { print_log } from "../../service/utils.js"
import { DEFAULT_SESSION, MATCH_CONDITION, AI_UID } from "../constants.js"

let waitingHumans = new Set()
let lastItem = -1
let lastOrder = -1

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

function getRandomOrderPair() {
  const idx =
    lastOrder === -1 ? Math.floor(Math.random() * ORDERS.length) : lastOrder
  lastOrder = lastOrder === -1 ? idx : -1
  print_log(
    `Selected Pair: ${JSON.stringify(ORDERS[idx][0])} ↔ ${JSON.stringify(
      ORDERS[idx][1],
    )}`,
    5,
  )
  return ORDERS[idx]
}

function getRandomItems() {
  const items = []
  const idx =
    lastItem === -1 ? Math.floor(Math.random() * ITEMINDEX.length) : lastItem
  lastItem = lastItem === -1 ? idx : -1
  ITEMINDEX[idx].forEach((i) => items.push(ITEMS[i]))
  return items
}

export function removeFromWaiting(userId) {
  waitingHumans.delete(userId)
}

export default async function handleMatchUser(socket, { userId }) {
  print_log(`Handling match for user: ${userId}`, 5)
  let session = userSession.get(userId)

  const isNewSession = !session || session.ended || session.currentI >= 3
  if (isNewSession) {
    session = { ...DEFAULT_SESSION }

    let assignedOrder, assignedItems

    if (waitingHumans.size === 0) {
      const [orderA] = getRandomOrderPair()
      assignedOrder = orderA
      assignedItems = getRandomItems()
      print_log(
        `No one waiting. Assigned order to ${userId}: ${JSON.stringify(
          assignedOrder,
        )}`,
        5,
      )
    } else {
      const waitingUserId = waitingHumans.values().next().value
      const waitingSession = userSession.get(waitingUserId)
      print_log(`Found waiting user: ${waitingUserId}`, 5)
      print_log(
        `Waiting user's order: ${JSON.stringify(waitingSession.types)}`,
        5,
      )

      const matchPair = ORDERS.find(
        ([orderA]) =>
          JSON.stringify(orderA) === JSON.stringify(waitingSession.types),
      )
      assignedOrder = matchPair ? matchPair[1] : getRandomOrderPair()[1]
      assignedItems = getRandomItems()
      print_log(
        `Matched complementary order for ${userId}: ${JSON.stringify(
          assignedOrder,
        )}`,
        5,
      )
    }

    const typeList = await createChatRoomListService(userId, assignedOrder)

    session = {
      ...session,
      ended: false,
      types: assignedOrder,
      items: assignedItems,
      currentI: 0,
      currentList: typeList._id,
    }
    userSession.set(userId, session)
    print_log(
      `Final order for ${userId}: Order = ${JSON.stringify(session.types)}`,
      5,
    )
  }

  const curI = session.currentI
  const curItem = session.items[curI]
  const curList = session.currentList

  session.isMatching = true
  userSession.set(userId, session)

  const io = socket.server
  if (MATCH_CONDITION === "GPT") {
    const newRoom = await createChatRoomService(
      [userId, AI_UID],
      curItem,
      "GPT",
      curList,
    )
    await appendChatRoomService(newRoom._id, curList)

    const updatedSession = {
      ...session,
      isMatching: false,
      currentChatRoom: newRoom,
      matchedUser: AI_UID,
    }
    userSession.set(userId, updatedSession)

    io.to(onlineUsers.get(userId)).emit("matchedUser", {
      data: {
        ...newRoom.toObject(),
        chatType: "GPT",
        index: curI,
      },
      session: updatedSession,
    })

    print_log(`[Match] ${userId} matched with GPT`, 5)
    return
  }

  if (MATCH_CONDITION === "CON") {
    const newRoom = await createChatRoomService(
      [userId],
      curItem,
      "CON",
      curList,
    )
    await appendChatRoomService(newRoom._id, curList)

    const updatedSession = {
      ...session,
      isMatching: false,
      currentChatRoom: newRoom,
      matchedUser: null,
    }
    userSession.set(userId, updatedSession)

    io.to(onlineUsers.get(userId)).emit("matchedUser", {
      data: { ...newRoom.toObject(), chatType: "CON", index: curI },
      session: updatedSession,
    })

    print_log(`[Match] ${userId} matched with CON (non-interactive)`, 5)
    return
  }

  if (waitingHumans.size === 0) {
    waitingHumans.add(userId)
    print_log(`[Match] ${userId} added to waitingHumans`, 5)
  } else {
    const waitingUserId = waitingHumans.values().next().value
    waitingHumans.delete(waitingUserId)

    if (!onlineUsers.has(waitingUserId)) {
      print_log(
        `[Guard] Waiting user ${waitingUserId} is offline, re-queuing ${userId}`,
        5,
      )
      waitingHumans.add(userId)
      return
    }

    if (waitingUserId === userId) {
      waitingHumans.add(userId)
      print_log(`[Guard] Prevented self-match for ${userId}`, 5)
      return
    }

    const waitingSession = userSession.get(waitingUserId)

    const newRoom = await createChatRoomService(
      [userId, waitingUserId],
      curItem,
      "HUM",
      curList,
    )
    await appendChatRoomService(newRoom._id, curList)

    const updatedSessionA = {
      ...session,
      isMatching: false,
      currentChatRoom: newRoom,
      matchedUser: waitingUserId,
    }

    const updatedSessionB = {
      ...waitingSession,
      isMatching: false,
      currentChatRoom: newRoom,
      matchedUser: userId,
    }

    userSession.set(userId, updatedSessionA)
    userSession.set(waitingUserId, updatedSessionB)

    print_log(`[Emit] matchedUser to ${userId}`, 5)
    print_log(`[Emit] matchedUser to ${waitingUserId}`, 5)

    io.to(onlineUsers.get(userId)).emit("matchedUser", {
      data: {
        ...newRoom.toObject(),
        chatType: updatedSessionA.types[updatedSessionA.currentI],
        index: updatedSessionA.currentI,
      },
      session: updatedSessionA,
    })

    io.to(onlineUsers.get(waitingUserId)).emit("matchedUser", {
      data: {
        ...newRoom.toObject(),
        chatType: updatedSessionB.types[updatedSessionB.currentI],
        index: updatedSessionB.currentI,
      },
      session: updatedSessionB,
    })

    print_log(`[Match] Matched ${userId} with ${waitingUserId}`, 5)
    print_log(`Chat room created (HUM) for ${userId} and ${waitingUserId}`, 5)
  }
}
