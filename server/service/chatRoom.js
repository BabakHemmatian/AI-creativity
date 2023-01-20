import ChatRoom from "../models/ChatRoom.js";

export const createChatRoomService = async (members, insText) => {
    const newChatRoom = new ChatRoom({
        members: members,
        instruction: insText,
        isEnd: false,
        earlyEnd: false
    });

    try {
        await newChatRoom.save();
        return newChatRoom;
    } catch(error) {
        console.log(error);
        return null;
    }
}

export const endChatRoomService = async (roomId, isEarly) => {
    try {
        console.log("start service");
        await ChatRoom.updateOne({_id: roomId, isEnd: false}, {earlyEnd: isEarly, isEnd: true});
        console.log("update to mongo");
        return true;
    } catch(error) {
        console.log(error);
        return false;
    }
}