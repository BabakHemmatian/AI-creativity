import ChatRoom from "../models/ChatRoom.js";
import ChatRoomList from "../models/ChatRoomList.js";

const LIST = ['HUM', 'GPT', 'CON'];
const orders = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 1, 0],
    [2, 0, 1]
];

export const createRandomChatRoomListService = async(userId) => {
    const index = Math.floor(Math.random() * 6);
    const chatTypes = [];
    orders[index].forEach((i) => {
        chatTypes.push(LIST[i])
    })
    console.log("create an order");
    console.log(chatTypes);
    
    newList = createChatRoomListService(userId, chatTypes);
    return newList;
}

export const createChatRoomListService = async(userId, chatTypes) => {
    const newChatRoomList = new ChatRoomList({
        user: userId,
        chatTypes: chatTypes,
        chatRooms: [],
    })

    try {
        await newChatRoomList.save();
        return newChatRoomList;
    } catch(error) {
        console.log("fail to create chat room list");
        // console.log(error);
        return null;
    }
}

export const appendChatRoomService = async (roomId, listId) => {
    try {
        await ChatRoomList.updateOne({_id: listId}, {$push: {chatRooms: roomId}});
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

export const createChatRoomService = async (members, insText, type, listId) => {
    const newChatRoom = new ChatRoom({
        members: members,
        instruction: insText,
        isEnd: false,
        earlyEnd: false,
        ChatRoomList: listId,
        chatType: type
    });

    try {
        await newChatRoom.save();
        return newChatRoom;
    } catch(error) {
        console.log(error);
        return null;
    }
}

/**
 * Stamp `startedAt` exactly once, when the round clock actually starts.
 * Idempotent: if `startedAt` is already set (e.g. partner raced us for a
 * HUM round, or the client reconnected and re-emitted "ready") the
 * existing value is preserved.
 */
export const setChatRoomStartedAtService = async (roomId, when) => {
    try {
        await ChatRoom.updateOne(
            { _id: roomId, startedAt: null },
            { startedAt: when },
        );
        return true;
    } catch (error) {
        console.log(error);
        return false;
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