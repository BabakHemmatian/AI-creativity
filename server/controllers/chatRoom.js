import ChatRoom from "../models/ChatRoom.js";
import { endChatRoomService } from "../service/chatRoom.js";

export const createChatRoom = async (req, res) => {
  const newChatRoom = new ChatRoom({
    members: [req.body.senderId, req.body.receiverId],
  });

  try {
    await newChatRoom.save();
    res.status(201).json(newChatRoom);
  } catch (error) {
    res.status(409).json({
      message: error.message,
    });
  }
};

export const getChatRoomOfUser = async (req, res) => {
  try {
    const chatRoom = await ChatRoom.find({
      members: { $in: [req.params.userId] },
    });
    res.status(200).json(chatRoom);
  } catch (error) {
    res.status(404).json({
      message: error.message,
    });
  }
};

export const getChatRoomOfUsers = async (req, res) => {
  try {
    const chatRoom = await ChatRoom.find({
      members: { $all: [req.params.firstUserId, req.params.secondUserId] },
    });
    res.status(200).json(chatRoom);
  } catch (error) {
    res.status(404).json({
      message: error.message,
    });
  }
};


export const endChatRoom = async (req, res) => {
  try {
    console.log(req);
    const success = await endChatRoomService(req.params.roomId, false);
    if (success) {
      res.status(200).json({
        message: "OK"
      });
    } else {
      res.status(500).json({
        message: "fail to end chatroom"
      })
    }
  } catch (error) {
    console.log(error);
  }

}