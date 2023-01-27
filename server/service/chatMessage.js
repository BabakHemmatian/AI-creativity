import ChatMessage from "../models/ChatMessage.js";
import Message from "../models/ChatMessage.js";

export const createChatMessageService = async (roomId, sender, message) => {
    const newMessage = new ChatMessage({
        chatRoomId: roomId,
        sender: sender,
        message: message
    })

    try {
        await newMessage.save();
        return newMessage;
    } catch (error) {
        console.log(error);
        return null;
    }
}