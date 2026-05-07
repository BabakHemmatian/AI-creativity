import { print_log } from "../../service/utils.js"
import { getKey } from "../helpers.js"
import { removeFromWaiting } from "./matchUser.js"
import { removeFromReady } from "./startRound.js"
import { cancelChatLoop } from "./ready.js"
import { endChatRoomService } from "../../service/chatRoom.js"
import UserSession from "../../models/UserSession.js"

// Round duration used by the round-end checker / client countdown.
const ROUND_DURATION_MS =
  (Number(process.env.REACT_APP_SESSION_TIME) || 240) * 1000

// How long to wait after a HUM disconnect before actually closing the room
// with `earlyEnd: true`. This absorbs transient blips (tab refresh, Wi-Fi
// hiccup, brief laptop sleep) so the admin dashboard doesn't flicker a
// HUM round to "ended" for a user who simply reconnects a few seconds later.
const DISCONNECT_GRACE_MS =
  Number(process.env.DISCONNECT_GRACE_MS) || 30 * 1000

/**
 * Pending `earlyEnd` closers, keyed by userId. Populated when a user with
 * an active HUM round disconnects; cleared by `addUser.js` on reconnect
 * or by this file when the timer actually fires.
 */
const pendingEarlyEndTimers = new Map()

export function cancelPendingEarlyEnd(userId) {
  const entry = pendingEarlyEndTimers.get(userId)
  if (!entry) return false
  clearTimeout(entry.timerId)
  pendingEarlyEndTimers.delete(userId)
  print_log(
    `[Disconnect] Cancelled pending earlyEnd for ${userId} (room ${entry.roomId})`,
    4,
  )
  return true
}

export default async function handleDisconnect(socket) {
  try {
    const userId = getKey(onlineUsers, socket.id)

    if (!userId) {
      print_log("[Disconnect] Could not resolve userId for socket, skipping", 2)
      return
    }

    const now = new Date()

    try { await removeFromWaiting(userId) } catch (e) {
      print_log(`[Disconnect] removeFromWaiting error: ${e.message}`, 1)
    }
    removeFromReady(userId)
    cancelChatLoop(userId)

    onlineUsers.delete(userId)
    print_log(`logout: ${userId} ${now}`, 4)

    const session = await UserSession.findOne({ userId })
    if (!session) return

    // Clean up readyMap entries for HUM rooms this user was in
    if (global.readyMap) {
      for (const [roomId, readySet] of global.readyMap.entries()) {
        if (readySet.has(userId)) {
          readySet.delete(userId)
          if (readySet.size === 0) global.readyMap.delete(roomId)
        }
      }
    }

    // Close the current ChatRoom as an early end ONLY for HUM rounds
    // whose clock is actually running (`phase === "in_round"`).
    //
    // GPT / CON rounds must NOT be closed here: tab blips, Wi-Fi drops,
    // and laptop-sleeps all trigger a transient disconnect, and the user
    // is expected to reconnect and resume the same round.
    //
    // HUM rounds still awaiting "ready" (`phase === "ready_check"`) also
    // must NOT be closed: the clock never started, so the room didn't
    // really happen. Partner may still be waiting.
    //
    // If the round has been running less than `ROUND_DURATION_MS`, defer
    // the close by `DISCONNECT_GRACE_MS` so a quick reconnect can cancel
    // it. If it's already past its full duration, close immediately with
    // `earlyEnd: false` — the round played out and just needs an
    // `isEnd: true` stamp.
    const curType = session.types?.[session.currentI]
    const isHumMidRound =
      curType === "HUM" &&
      session.phase === "in_round" &&
      session.currentChatRoomId &&
      session.roundStartedAt

    if (isHumMidRound) {
      const roomId = session.currentChatRoomId
      const elapsedMs = now.getTime() - session.roundStartedAt.getTime()
      if (elapsedMs >= ROUND_DURATION_MS) {
        try {
          await endChatRoomService(roomId, false)
          print_log(
            `[Disconnect] HUM room ${roomId} past duration ` +
              `(elapsed=${Math.round(elapsedMs / 1000)}s); closed without earlyEnd`,
            4,
          )
        } catch (e) {
          print_log(`[Disconnect] endChatRoomService error: ${e.message}`, 1)
        }
      } else {
        cancelPendingEarlyEnd(userId)
        const timerId = setTimeout(async () => {
          pendingEarlyEndTimers.delete(userId)
          try {
            await endChatRoomService(roomId, true)
            print_log(
              `[Disconnect] Grace expired; marked HUM room ${roomId} ` +
                `earlyEnd for ${userId}`,
              4,
            )
          } catch (e) {
            print_log(
              `[Disconnect] Deferred endChatRoomService error: ${e.message}`,
              1,
            )
          }
        }, DISCONNECT_GRACE_MS)
        pendingEarlyEndTimers.set(userId, { timerId, roomId })
        print_log(
          `[Disconnect] Scheduled earlyEnd for HUM room ${roomId} in ` +
            `${DISCONNECT_GRACE_MS}ms (elapsed=${Math.round(elapsedMs / 1000)}s)`,
          4,
        )
      }
    }

    if (recoverUser.has(userId)) {
      recoverUser.delete(userId)
    } else if (session.phase !== "completed") {
      const partnerId = session.matchedUserId
      if (partnerId && session.currentChatRoomId) {
        if (
          onlineUsers.has(partnerId) &&
          session.types &&
          session.types[session.currentI] === "HUM"
        ) {
          socket.server.to(partnerId).emit("refresh")
          recoverUser.add(partnerId)
        }
      }
    }

    session.disconnecttime = now
    await session.save()
  } catch (err) {
    print_log(`[Disconnect] ERROR: ${err.message}`, 1)
  }
}
