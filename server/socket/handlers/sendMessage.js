import { createChatMessageService } from "../../service/chatMessage.js"
import { print_log } from "../../service/utils.js"
import { AI_UID } from "../constants.js"

export default async function handleSendMessage(
  socket,
  { senderId, receiverId, message }
) {
  const session = userSession.get(senderId)
  const room = session?.currentChatRoom

  if (!room) {
    print_log(`sendMessage: room is undefined or null for ${senderId}`)
    return
  }

  const roomId = room._id.toString()
  const trimmed = message.trim()

  if (receiverId !== AI_UID) {
    const receiverSocket = onlineUsers.get(receiverId)
    if (receiverSocket) {
      socket
        .to(receiverSocket)
        .emit("getMessage", { senderId, message: trimmed, roomId })
    }
    print_log(`sendMessage: ${senderId} to ${receiverId}`, 3)
  } else {
    const messages = chatMessage.get(senderId)
    messages?.push({ text: trimmed, sender: 1, replied: false })
  }

  await createChatMessageService(roomId, senderId, trimmed)
}
