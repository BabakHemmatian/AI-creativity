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
    const index = Math.floor(Math.random() * 6)
    lastOrder = index
    return ORDERS[index][0]
  } else {
    const index = lastOrder
    lastOrder = -1
    return ORDERS[index][1]
  }
}

const getRandomItems = () => {
  const items = []
  if (lastItem === -1) {
    const index = Math.floor(Math.random() * 6)
    lastItem = index
    ITEMINDEX[index].forEach((i) => items.push(ITEMS[i]))
  } else {
    ITEMINDEX[lastItem].forEach((i) => items.push(ITEMS[i]))
    lastItem = -1
  }
  return items
}

const getOneRandomItem = () => {
  const items = []
  if (MATCH_CONDITION === "HUM") {
    if (lastItem === -1) {
      const index = Math.floor(Math.random() * 3)
      lastItem = index
      items.push(ITEMS[index])
    } else {
      items.push(ITEMS[lastItem])
      lastItem = -1
    }
  } else {
    const index = Math.floor(Math.random() * 3)
    items.push(ITEMS[index])
  }
  return items
}

export default async function handleMatchUser(socket, { userId }) {
  let session = userSession.get(userId)
  print_log(`matchUser: for ${userId}`, 5)

  if (session?.ended) {
    let newOrder = []
    let newItems = []

    if (MATCH_CONDITION === "ALL") {
      newOrder = getRandomOrders()
      newItems = getRandomItems()
    } else {
      newOrder = [MATCH_CONDITION]
      newItems = getOneRandomItem()
    }

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

  session.isMatching = true
  userSession.set(userId, session)

  const curI = session.currentI
  const curType = session.types[curI]
  const curItem = session.items[curI]
  const curList = session.currentList

  if (curType === "HUM") {
    if (!waitingHumans.includes(userId)) {
      waitingHumans.push(userId)
      print_log(`[Server:Match] Added ${userId} to waiting list`, 5)
    }

    // ✅ Delay matchmaking by 100ms
    setTimeout(async () => {
      while (waitingHumans.length >= 2) {
        const userA = waitingHumans.shift()
        const userB = waitingHumans.shift()

        const sessionA = userSession.get(userA)
        const sessionB = userSession.get(userB)

        if (!onlineUsers.has(userA) || !onlineUsers.has(userB)) {
          print_log(
            `[Server:Match] One of the users not online: ${userA}, ${userB}`,
            5
          )
          continue
        }

        sessionA.matchedUser = userB
        sessionB.matchedUser = userA

        userSession.set(userA, sessionA)
        userSession.set(userB, sessionB)

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

        socket
          .to(onlineUsers.get(userB))
          .emit("matchedUser", { data: newRoom, index: curI })
        socket
          .to(onlineUsers.get(userA))
          .emit("matchedUser", { data: newRoom, index: curI })

        print_log(
          `[Server:Match] Successfully matched ${userA} and ${userB}`,
          5
        )
      }
    }, 100)
  } else {
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
      const toShuffle = [...curResponse].sort(() => Math.random() - 0.5)
      session.conMes = toShuffle
    }

    userSession.set(userId, {
      ...session,
      isMatching: false,
      currentChatRoom: newRoom,
    })

    socket.emit("matchedUser", { data: newRoom, index: curI })
    chatMessage.set(userId, [{ text: curItem, sender: 0, replied: true }])
  }
}
