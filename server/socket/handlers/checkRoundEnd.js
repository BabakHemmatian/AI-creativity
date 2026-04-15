import { print_log } from "../../service/utils.js"
import { endChatRoomService } from "../../service/chatRoom.js"
import UserSession from "../../models/UserSession.js"

const DURATION_MS = (Number(process.env.REACT_APP_SESSION_TIME) || 240) * 1000
const checkRoundEndLocks = new Map()

export default async function handleCheckRoundEnd(socket, { userId }) {
  if (checkRoundEndLocks.get(userId)) {
    print_log(`[CheckRoundEnd] Already processing for ${userId}, ignoring duplicate`, 4)
    return
  }
  checkRoundEndLocks.set(userId, true)

  try {
    await _handleCheckRoundEnd(socket, userId)
  } catch (err) {
    print_log(`[CheckRoundEnd] ERROR for ${userId}: ${err.message}`, 1)
  } finally {
    checkRoundEndLocks.delete(userId)
  }
}

async function _handleCheckRoundEnd(socket, userId) {
  print_log(`[CheckRoundEnd] Received request from ${userId}`, 5)
  let session = await UserSession.findOne({ userId })

  if (!session) {
    print_log(`[CheckRoundEnd] Session not found for ${userId}`, 2)
    return
  }

  if (session.phase !== "in_round") {
    print_log(
      `[CheckRoundEnd] Invalid phase "${session.phase}" for ${userId}`,
      2,
    )
    return
  }

  if (!session.roundStartedAt) {
    print_log(
      `[CheckRoundEnd] No round clock yet (e.g. HUM waiting for both ready) for ${userId}`,
      4,
    )
    return
  }

  const now = Date.now()
  const roundEndTime =
    session.roundStartedAt.getTime() + DURATION_MS

  if (now < roundEndTime) {
    print_log(
      `[CheckRoundEnd] Round not yet over for ${userId} (${Math.ceil((roundEndTime - now) / 1000)}s remaining)`,
      4,
    )
    return
  }

  const curI = session.currentI
  if (session.currentChatRoomId) {
    await endChatRoomService(session.currentChatRoomId, false)
  }

  let newPhase, newI, newRoomId
  if (curI === 2) {
    newPhase = "completed"
    newI = 3
    newRoomId = session.currentChatRoomId
  } else {
    newPhase = "round_ended"
    newI = curI + 1
    newRoomId = null
  }

  session.phase = newPhase
  session.currentI = newI
  session.currentChatRoomId = newRoomId
  await session.save()

  const io = socket.server
  io.to(userId).emit("sessionUpdate", { session: session.toObject() })

  const partnerId = session.matchedUserId
  if (partnerId) {
    const partner = await UserSession.findOne({ userId: partnerId })
    if (partner && partner.phase === "in_round") {
      partner.phase = newPhase
      partner.currentI = newI
      partner.currentChatRoomId = newRoomId
      await partner.save()
      io.to(partnerId).emit("sessionUpdate", {
        session: partner.toObject(),
      })
    }
  }

  print_log(`[CheckRoundEnd] ${userId} advanced to round ${newI}`, 5)
}
