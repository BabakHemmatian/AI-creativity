import { print_log } from "../service/utils.js"
import { generateCompletion, chatgptReply } from "../service/openAI.js"
import { generateConReply } from "../service/constantReply.js"
import { createChatMessageService } from "../service/chatMessage.js"
import { AI_UID, NON_REPLY_PROMPT } from "./constants.js"

export default async function replyMessage(socket, userId) {
  const session = userSession.get(userId)
  const room = session?.currentChatRoom

  if (!session || !room) {
    print_log(`reply_message: missing session or room for user ${userId}`, -1)
    return
  }

  try {
    if (!not_ai_replied_first_map.has(userId)) {
      not_ai_replied_first_map.set(userId, false)
    }

    const roomId = room._id.toString()
    let messages = chatMessage.get(userId)
    const types = session.types
    const items = session.items
    const curI = session.currentI
    const curType = types[curI]
    const curItem = items[curI]
    let response = null

    if (curType === "CHT") {
      const userMessage = messages.filter((m) => m.sender === 1)
      const aiMessage = messages.filter((m) => m.sender === 2)
      const res = userToRes.get(userId)

      if (aiMessage.length === 0) {
        response = await chatgptReply(messages[0], messages, res)
      } else if (userMessage.length === 0) {
        response = await chatgptReply(
          { text: NON_REPLY_PROMPT, replied: true },
          messages,
          res,
        )
      } else {
        response = await chatgptReply(userMessage.at(-1), messages, res)
      }

      userToRes.set(userId, response)
      messages.push({ text: response.text, sender: 2, replied: true })
    } else if (curType === "GPT") {
      const isFirst = !not_ai_replied_first_map.get(userId)
      const lastMsg = messages.at(-1)
      if (isFirst || lastMsg?.sender === 1) {
        response = await generateCompletion(messages, isFirst)
        messages.push({ text: response.text, sender: 2, replied: true })
      }
      not_ai_replied_first_map.set(userId, true)
    } else {
      response = await generateConReply(messages, session.conMes)
      messages.push({ text: response, sender: 2, replied: true })
    }

    if (response?.text) {
      await createChatMessageService(roomId, AI_UID, response.text)
      const socketId = onlineUsers.get(userId)
      if (socketId) {
        socket.server.to(socketId).emit("getMessage", {
          senderId: AI_UID,
          message: response.text,
          roomId,
        })
      }
    }
  } catch (err) {
    print_log(`replyMessage error for ${userId}`, -1)
    print_log(err)
  }
}
