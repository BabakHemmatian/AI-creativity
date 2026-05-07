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

  // Partner sync is ONLY correct for HUM rounds, where both users share the
  // same ChatRoom and must advance together. For CON/GPT rounds each user
  // has their own room and their own clock (clock starts when *that* user
  // types "ready"), so advancing the partner here would (a) kick them out
  // of an unrelated live round and (b) leave their room with isEnd:false
  // forever — the only place that stamps isEnd:true is this very function
  // acting on session.currentChatRoomId, and we'd have just nulled it out.
  //
  // We also defensively verify the partner is in the *same* round and the
  // *same* room, so a stale matchedUserId from a previous HUM pairing
  // can't trigger a cross-round advance.
  const curType = session.types?.[curI]
  const partnerId = session.matchedUserId
  if (curType === "HUM" && partnerId) {
    const partner = await UserSession.findOne({ userId: partnerId })
    if (
      partner &&
      partner.phase === "in_round" &&
      partner.roundStartedAt &&
      partner.currentI === curI &&
      String(partner.currentChatRoomId) === String(session.currentChatRoomId)
    ) {
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
