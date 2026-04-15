import { print_log } from "../../service/utils.js"
import { endChatRoomService } from "../../service/chatRoom.js"
import UserSession from "../../models/UserSession.js"

const DURATION_MS = (Number(process.env.REACT_APP_SESSION_TIME) || 240) * 1000

export default async function handleCheckRoundEnd(socket, { userId }) {
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

  // Round is over; end the chat room first
  const curI = session.currentI
  if (session.currentChatRoomId) {
    await endChatRoomService(session.currentChatRoomId, false)
  }

  if (curI === 2) {
    session.phase = "completed"
    session.currentI = 3
  } else {
    session.phase = "round_ended"
    session.currentI = curI + 1
    session.currentChatRoomId = null
  }

  await session.save()

  const io = socket.server
  const payload = { session: session.toObject() }

  io.to(userId).emit("sessionUpdate", payload)

  const partnerId = session.matchedUserId
  if (partnerId) {
    const partner = await UserSession.findOne({ userId: partnerId })
    if (partner) {
      partner.phase = session.phase
      partner.currentI = session.currentI
      partner.currentChatRoomId = session.currentChatRoomId
      await partner.save()
      io.to(partnerId).emit("sessionUpdate", {
        session: partner.toObject(),
      })
    }
  }

  print_log(`[CheckRoundEnd] ${userId} advanced to round ${session.currentI}`, 5)
}
