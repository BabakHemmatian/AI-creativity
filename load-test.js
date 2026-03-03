import { io } from "socket.io-client"

const SERVER_URL = "http://localhost:8080"
const NUM_USERS = 400
const CONNECT_STAGGER_MS = 10
const AI_UID = "LoTCd7n6KyUXFZcOwlAbvVt2Hjw1"

const stats = {
  connected: 0,
  sessionReady: 0,
  matched: 0,
  roundReady: 0,
  userReady: 0,
  sessionStarted: 0,
  gotMessage: 0,
  selfMatch: 0,
  errors: 0,
}

const roomMembers = new Map()

const herdQueue = [] // { socket, uid } waiting to matchUser
let herdFired = false

function fireHerd() {
  herdFired = true
  console.log(
    `\n>>> THUNDERING HERD: firing matchUser for all ${herdQueue.length} users simultaneously <<<\n`,
  )
  for (const { socket, uid } of herdQueue) {
    socket.emit("matchUser", { userId: uid })
  }
}

function simulateUser(index) {
  const uid = `loadtest-user-${index}`

  const socket = io(SERVER_URL, {
    auth: { token: uid },
    transports: ["websocket"],
  })

  let matchedRoom = null
  let matchedPartnerId = null
  let roundStarted = false

  socket.on("connect", () => {
    stats.connected++
    socket.emit("addUser", uid)
  })

  socket.on("getSession", () => {
    roundStarted = false

    if (!herdFired) {
      stats.sessionReady++
      herdQueue.push({ socket, uid })
      if (herdQueue.length === NUM_USERS) {
        fireHerd()
      }
    } else {
      socket.emit("matchUser", { userId: uid })
    }
  })

  socket.on("matchedUser", ({ data }) => {
    matchedRoom = data
    // find the partner (the other member, not us)
    matchedPartnerId = data?.members?.find((m) => m !== uid) ?? AI_UID

    if (!roundStarted) {
      roundStarted = true
      stats.matched++

      if (data?.members?.filter((m) => m === uid).length > 1) {
        stats.selfMatch++
        console.error(`[SELF-MATCH] ${uid} was matched with themselves!`)
      }

      socket.emit("startRound", { userId: uid })
    } else {
      stats.roundReady++

      const roomId = data?._id?.toString()
      const chatType = data?.chatType
      if (roomId) {
        if (!roomMembers.has(roomId))
          roomMembers.set(roomId, { members: new Set(), chatType })
        roomMembers.get(roomId).members.add(uid)
        if (roomMembers.get(roomId).members.size > 2) {
          console.error(
            `[ROOM OVERFLOW] Room ${roomId} (${chatType}) has >2 users: ${[...roomMembers.get(roomId).members]}`,
          )
        }
      }

      socket.emit("ready", { chatRoom: data, userId: uid })
    }
  })

  socket.on("userReady", () => {
    stats.userReady++
  })

  socket.on("startChatSession", () => {
    stats.sessionStarted++
  })

  socket.on("getMessage", ({ message }) => {
    stats.gotMessage++
    if (matchedRoom) {
      socket.emit("sendMessage", {
        senderId: uid,
        receiverId: matchedPartnerId,
        message: "A pencil can be used as a drumstick",
      })
    }
  })

  socket.on("connect_error", (err) => {
    stats.errors++
    console.error(`[User ${index}] connect error: ${err.message}`)
  })

  setTimeout(() => socket.disconnect(), 2 * 60 * 1000)
}

setInterval(() => {
  const stuckHumRooms = [...roomMembers.values()].filter(
    (r) => r.chatType === "HUM" && r.members.size === 1,
  ).length
  const humRooms = [...roomMembers.values()].filter(
    (r) => r.chatType === "HUM",
  ).length
  const aiRooms = [...roomMembers.values()].filter(
    (r) => r.chatType !== "HUM",
  ).length

  console.log(
    `[Stats] connected=${stats.connected} | sessionReady=${stats.sessionReady} | matched=${stats.matched} | roundReady=${stats.roundReady} | userReady=${stats.userReady} | sessionStarted=${stats.sessionStarted} | messages=${stats.gotMessage} | humRooms=${humRooms} | aiRooms=${aiRooms} | stuckHUM=${stuckHumRooms} | selfMatch=${stats.selfMatch} | errors=${stats.errors}`,
  )
}, 5000)

console.log(
  `Connecting ${NUM_USERS} users (${CONNECT_STAGGER_MS}ms stagger), then firing matchUser all at once...`,
)
for (let i = 0; i < NUM_USERS; i++) {
  setTimeout(() => simulateUser(i), i * CONNECT_STAGGER_MS)
}
