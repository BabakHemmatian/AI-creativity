import { createChatMessageService } from "../../service/chatMessage.js"
import { print_log } from "../../service/utils.js"
import { AI_UID } from "../constants.js"

export default async function handleSendMessage(
  socket,
  { senderId, receiverId, message, chatRoom }
) {
  const roomId = chatRoom?._id != null ? String(chatRoom._id) : null

  if (!roomId) {
    print_log(`sendMessage: room is undefined or null for ${senderId}`)
    return
  }

  const trimmed = message.trim()
  const io = socket.server

  // CON rooms only include the human in `members`, so the client sends no receiverId.
  // Route those messages into the same in-memory buffer as GPT→AI traffic.
  const effectiveReceiver =
    receiverId ||
    (chatRoom?.chatType === "CON" ? AI_UID : receiverId)

  if (effectiveReceiver && effectiveReceiver !== AI_UID) {
    if (onlineUsers.has(effectiveReceiver)) {
      io.to(effectiveReceiver).emit("getMessage", {
        senderId,
        message: trimmed,
        roomId,
      })
    } else {
      print_log(`sendMessage: receiver ${effectiveReceiver} offline, no socket`, 2)
    }
    print_log(`sendMessage: ${senderId} to ${effectiveReceiver}`, 3)
  } else {
    const messages = chatMessage.get(senderId)
    messages?.push({ text: trimmed, sender: 1, replied: false })
  }

  await createChatMessageService(roomId, senderId, trimmed)
}
