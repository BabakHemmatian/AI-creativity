import ChatMessage from "../models/ChatMessage.js";
import { createChatMessageService } from "../service/chatMessage.js";
//used for one user sending message
export const createMessage = async (req, res) => {
  try {
    const newMessage = await createChatMessageService(req.body.chatRoomId, req.body.sender, req.body.message);
    if (newMessage !== null) {
      res.status(201).json(newMessage);
    } else {
      res.status(500).json({
        message: "service error"
      });
    }
    
  } catch (error) {
    res.status(409).json({
      message: error.message,
    });
  }
};

//used for showing messages for user
export const getMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.find({
      chatRoomId: req.params.chatRoomId,
    });
    res.status(200).json(messages);
  } catch (error) {
    res.status(409).json({
      message: error.message,
    });
  }
};
