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

const ITEMS = (process.env.ITEMS || "brick,paperclip,shoe").split(",")
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
  const idx = Math.floor(Math.random() * ORDERS.length)
  print_log(
    `Selected Pair: ${JSON.stringify(ORDERS[idx][0])} ↔ ${JSON.stringify(
      ORDERS[idx][1],
    )}`,
    5,
  )
  return ORDERS[idx]
}

function getRandomItems() {
  const idx = Math.floor(Math.random() * ITEMINDEX.length)
  return ITEMINDEX[idx].map((i) => ITEMS[i])
}

function findComplementaryOrder(userOrder) {
  const pair = ORDERS.find(
    ([orderA]) => JSON.stringify(orderA) === JSON.stringify(userOrder),
  )
  if (!pair) {
    // Unreachable in normal flow: matchers are always assigned orderA.
    // If this ever fires, the ORDERS table and the assignment path drifted.
    print_log(
      `[Match] No complementary order for ${JSON.stringify(userOrder)}; ` +
        `falling back to a random complement`,
      1,
    )
    return getRandomOrderPair()[1]
  }
  return pair[1]
}

export async function removeFromWaiting(userId) {
  await MatchQueue.updateOne(
    { userId, status: "waiting" },
    { status: "timed_out" },
  )
}

const matchLocks = new Map()

export default async function handleMatchUser(socket, { userId }) {
  if (matchLocks.get(userId)) {
    print_log(`[Match] Already processing for ${userId}, ignoring duplicate`, 4)
    return
  }
  matchLocks.set(userId, true)

  try {
    await _handleMatchUser(socket, userId)
  } catch (err) {
    print_log(`[Match] ERROR for ${userId}: ${err.message}`, 1)
  } finally {
    matchLocks.delete(userId)
  }
}

async function _handleMatchUser(socket, userId) {
  print_log(`Handling match for user: ${userId}`, 5)
  let session = await UserSession.findOne({ userId })

  // BUG 1 guard: if the user is already paired, in a round, or between
  // rounds, do NOT run matching again. Re-running would overwrite
  // matchedUserId and could queue a duplicate MatchQueue entry,
  // letting a third user silently steal the partnership.
  if (
    session &&
    session.matchedUserId &&
    (session.phase === "matched" ||
      session.phase === "in_round" ||
      session.phase === "round_ended")
  ) {
    print_log(
      `[Match] ${userId} already has partner ${session.matchedUserId} ` +
        `(phase=${session.phase}); skipping re-match`,
      4,
    )
    return
  }

  // Treat addUser placeholder (currentI -1 / no study order) as needing a fresh study session
  const isNewSession =
    !session ||
    session.phase === "completed" ||
    session.currentI >= 3 ||
    session.currentI < 0 ||
    !session.types?.length
  if (isNewSession) {
    // Avoid duplicate UserSession docs per userId (addUser placeholder, completed runs, etc.)
    await UserSession.deleteMany({ userId })
    // BUG 4 fix: also retire any stale "waiting" queue entries owned by this
    // userId so another matcher can't dequeue a ghost referencing the now-deleted session.
    await MatchQueue.updateMany(
      { userId, status: "waiting" },
      { status: "timed_out" },
    )

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
  let curList = session.currentChatRoomListId

  // BUG 5 fix: the GPT/CON/HUM branches below assume a ChatRoomList exists
  // on this session. Normally the isNewSession block created it, but on
  // recovered / partially-initialized sessions it can be missing. Create
  // one on demand so downstream createChatRoomService / appendChatRoomService
  // never silently write to a null listId.
  if (!curList) {
    print_log(
      `[Match] Session for ${userId} missing currentChatRoomListId; creating one`,
      2,
    )
    const typeList = await createChatRoomListService(userId, session.types)
    curList = typeList._id.toString()
    session.currentChatRoomListId = curList
    await session.save()
  }

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

    // Room created but round clock has not started. ready.js flips this
    // to "in_round" when the user types "ready".
    session.phase = "ready_check"
    session.currentChatRoomId = newRoom._id.toString()
    session.matchedUserId = AI_UID
    session.roundStartedAt = null
    await session.save()

    io.to(userId).emit("matchedUser", {
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

    session.phase = "ready_check"
    session.currentChatRoomId = newRoom._id.toString()
    session.matchedUserId = null
    session.roundStartedAt = null
    await session.save()

    io.to(userId).emit("matchedUser", {
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
        `[Guard] Waiting user ${waitingUserId} is offline or missing, re-queuing waiter and enqueueing ${userId}`,
        5,
      )
      await MatchQueue.updateOne(
        { _id: waitingUser._id },
        { status: "timed_out" },
      )
      const queueEntry = new MatchQueue({
        userId,
        userSessionId: session._id,
        types: session.types,
        queuedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: "waiting",
      })
      await queueEntry.save()
      print_log(`[Match] ${userId} added to MatchQueue (after stale waiter)`, 5)
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

    // Update both sessions — paired but no room yet (startRound creates rooms)
    session.phase = "matched"
    session.matchedUserId = waitingUserId
    session.matchId = match._id.toString()
    await session.save()

    waitingSession.phase = "matched"
    waitingSession.matchedUserId = userId
    waitingSession.matchId = match._id.toString()
    waitingSession.types = matchedOrder
    // BUG 3 fix: both paired users must see the same item for each round index.
    // The HUM room's instruction is taken from whichever partner calls startRound
    // first; if items diverge, the other partner's session.items disagrees with
    // what they actually saw. Force the waiter to adopt the matcher's item
    // sequence so the persisted data matches the chat.
    waitingSession.items = Array.isArray(session.items) ? [...session.items] : []
    await waitingSession.save()

    // Update queue entry
    await MatchQueue.updateOne(
      { _id: waitingUser._id },
      { status: "matched", expiresAt: new Date(Date.now() + 100 * 1000) },
    )

    // Emit to both users — no room data; frontend will call startRound
    print_log(`[Emit] matchedUser to ${userId}`, 5)
    print_log(`[Emit] matchedUser to ${waitingUserId}`, 5)

    io.to(userId).emit("matchedUser", {
      data: null,
      session: session.toObject(),
    })

    io.to(waitingUserId).emit("matchedUser", {
      data: null,
      session: waitingSession.toObject(),
    })

    print_log(`[Match] Paired ${userId} with ${waitingUserId}`, 5)
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
