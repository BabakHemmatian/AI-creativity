import {
  createChatRoomService,
  appendChatRoomService,
  createChatRoomListService,
} from "../../service/chatRoom.js"
import { print_log } from "../../service/utils.js"
import { MATCH_CONDITION, AI_UID } from "../constants.js"
import UserSession from "../../models/UserSession.js"
import MatchQueue from "../../models/MatchQueue.js"
import Match from "../../models/Match.js"

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

// ORDERS: pairs where HUM is at same index, CON and GPT are flipped
const ORDERS = [
  // HUM at index 0
  [
    ["HUM", "CON", "GPT"],
    ["HUM", "GPT", "CON"],
  ],
  // HUM at index 1
  [
    ["CON", "HUM", "GPT"],
    ["GPT", "HUM", "CON"],
  ],
  // HUM at index 2
  [
    ["CON", "GPT", "HUM"],
    ["GPT", "CON", "HUM"],
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

function findComplementaryOrder(userOrder) {
  const pair = ORDERS.find(
    ([orderA]) => JSON.stringify(orderA) === JSON.stringify(userOrder),
  )
  return pair ? pair[1] : getRandomOrderPair()[1]
}

export async function removeFromWaiting(userId) {
  await MatchQueue.updateOne(
    { userId, status: "waiting" },
    { status: "timed_out" },
  )
}

export default async function handleMatchUser(socket, { userId }) {
  print_log(`Handling match for user: ${userId}`, 5)
  let session = await UserSession.findOne({ userId })

  const isNewSession =
    !session || session.phase === "completed" || session.currentI >= 3
  if (isNewSession) {
    let assignedOrder, assignedItems

    if (MATCH_CONDITION !== "ALL") {
      assignedOrder = [MATCH_CONDITION, MATCH_CONDITION, MATCH_CONDITION]
      assignedItems = getRandomItems()
    } else {
      assignedOrder = getRandomOrderPair()[0]
      assignedItems = getRandomItems()
      print_log(
        `Assigned order to ${userId}: ${JSON.stringify(assignedOrder)}`,
        5,
      )
    }

    const typeList = await createChatRoomListService(userId, assignedOrder)

    session = new UserSession({
      userId,
      phase: "waiting",
      currentI: 0,
      types: assignedOrder,
      items: assignedItems,
      currentChatRoomId: null,
      currentChatRoomListId: typeList._id.toString(),
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 3600 * 1000),
      tags: [],
    })
    await session.save()
    print_log(
      `Final order for ${userId}: Order = ${JSON.stringify(session.types)}`,
      5,
    )
  }

  const curI = session.currentI
  const curItem = session.items[curI]
  const curList = session.currentChatRoomListId

  session.phase = "matched"
  await session.save()

  const io = socket.server

  // Handle GPT matching
  if (MATCH_CONDITION === "GPT") {
    const newRoom = await createChatRoomService(
      [userId, AI_UID],
      curItem,
      "GPT",
      curList,
    )
    await appendChatRoomService(newRoom._id, curList)

    session.phase = "in_round"
    session.currentChatRoomId = newRoom._id.toString()
    session.matchedUserId = AI_UID
    await session.save()

    io.to(onlineUsers.get(userId)).emit("matchedUser", {
      data: {
        ...newRoom.toObject(),
        chatType: "GPT",
        index: curI,
      },
      session: session.toObject(),
    })

    print_log(`[Match] ${userId} matched with GPT`, 5)
    return
  }

  // Handle CON matching
  if (MATCH_CONDITION === "CON") {
    const newRoom = await createChatRoomService(
      [userId],
      curItem,
      "CON",
      curList,
    )
    await appendChatRoomService(newRoom._id, curList)

    session.phase = "in_round"
    session.currentChatRoomId = newRoom._id.toString()
    session.matchedUserId = null
    await session.save()

    io.to(onlineUsers.get(userId)).emit("matchedUser", {
      data: { ...newRoom.toObject(), chatType: "CON", index: curI },
      session: session.toObject(),
    })

    print_log(`[Match] ${userId} matched with CON (non-interactive)`, 5)
    return
  }

  // Handle HUM matching: atomically dequeue a waiting user
  const waitingUser = await MatchQueue.findOneAndUpdate(
    {
      status: "waiting",
      expiresAt: { $gt: new Date() },
    },
    { status: "matching_in_progress" },
    { sort: { queuedAt: 1 }, new: true },
  )

  if (waitingUser) {
    const waitingUserId = waitingUser.userId
    const waitingSession = await UserSession.findOne({ userId: waitingUserId })

    if (!waitingSession || !onlineUsers.has(waitingUserId)) {
      print_log(
        `[Guard] Waiting user ${waitingUserId} is offline or missing, re-queuing ${userId}`,
        5,
      )
      await MatchQueue.updateOne(
        { _id: waitingUser._id },
        { status: "waiting" },
      )
      return
    }

    if (waitingUserId === userId) {
      print_log(`[Guard] Prevented self-match for ${userId}`, 5)
      await MatchQueue.updateOne(
        { _id: waitingUser._id },
        { status: "waiting" },
      )
      return
    }

    // Create chat room for HUM round
    const newRoom = await createChatRoomService(
      [userId, waitingUserId],
      curItem,
      "HUM",
      curList,
    )
    await appendChatRoomService(newRoom._id, curList)

    // Determine complementary order for waiting user
    const matchedOrder = findComplementaryOrder(session.types)

    // Create Match document
    const match = new Match({
      userIdA: userId,
      userIdB: waitingUserId,
      userSessionIdA: session._id,
      userSessionIdB: waitingSession._id,
      status: "active",
      expiresAt: new Date(Date.now() + 3600 * 1000),
      chatRoomListId: session.currentChatRoomListId,
      metadata: { initiatedBy: userId },
    })
    await match.save()

    // Update both sessions
    session.phase = "in_round"
    session.currentChatRoomId = newRoom._id.toString()
    session.matchedUserId = waitingUserId
    session.matchId = match._id.toString()
    await session.save()

    waitingSession.phase = "in_round"
    waitingSession.currentChatRoomId = newRoom._id.toString()
    waitingSession.matchedUserId = userId
    waitingSession.matchId = match._id.toString()
    waitingSession.types = matchedOrder
    await waitingSession.save()

    // Update queue entry
    await MatchQueue.updateOne(
      { _id: waitingUser._id },
      { status: "matched", expiresAt: new Date(Date.now() + 100 * 1000) },
    )

    // Emit to both users
    print_log(`[Emit] matchedUser to ${userId}`, 5)
    print_log(`[Emit] matchedUser to ${waitingUserId}`, 5)

    io.to(onlineUsers.get(userId)).emit("matchedUser", {
      data: {
        ...newRoom.toObject(),
        chatType: session.types[session.currentI],
        index: session.currentI,
      },
      session: session.toObject(),
    })

    io.to(onlineUsers.get(waitingUserId)).emit("matchedUser", {
      data: {
        ...newRoom.toObject(),
        chatType: waitingSession.types[waitingSession.currentI],
        index: waitingSession.currentI,
      },
      session: waitingSession.toObject(),
    })

    print_log(`[Match] Matched ${userId} with ${waitingUserId}`, 5)
    print_log(`Chat room created (HUM) for ${userId} and ${waitingUserId}`, 5)
  } else {
    // No one waiting; add self to queue
    const queueEntry = new MatchQueue({
      userId,
      userSessionId: session._id,
      types: session.types,
      queuedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min timeout
      status: "waiting",
    })
    await queueEntry.save()
    print_log(`[Match] ${userId} added to MatchQueue`, 5)
  }
}
