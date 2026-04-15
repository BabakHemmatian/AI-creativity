import { print_log } from "../service/utils.js"
import { generateCompletion, chatgptReply } from "../service/openAI.js"
import { generateConReply } from "../service/constantReply.js"
import { createChatMessageService } from "../service/chatMessage.js"
import { AI_UID, NON_REPLY_PROMPT } from "./constants.js"

export default async function replyMessage(socket, userId, session) {
  const roomId = session?.currentChatRoomId

  if (!session || !roomId) {
    print_log(`reply_message: missing session or room for user ${userId}`, -1)
    return
  }

  try {
    if (!not_ai_replied_first_map.has(userId)) {
      not_ai_replied_first_map.set(userId, false)
    }

    let messages = chatMessage.get(userId)
    if (!messages) {
      print_log(`reply_message: no chatMessage buffer for ${userId}`, -1)
      return
    }

    const curI = session.currentI
    const curType = session.types[curI]
    const curItem = session.items[curI]
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
      messages.push({ text: response.text, sender: 2, replied: true })
    }

    const replyText = response?.text ?? response
    if (replyText) {
      await createChatMessageService(roomId, AI_UID, replyText)
      socket.server.to(userId).emit("getMessage", {
        senderId: AI_UID,
        message: replyText,
        roomId,
      })
    }
  } catch (err) {
    print_log(`replyMessage error for ${userId}`, -1)
    print_log(err)
  }
}
