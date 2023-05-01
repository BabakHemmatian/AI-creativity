import mongoose from "mongoose";

const ChatRoomSchema = mongoose.Schema(
  {
    members: Array,
    instruction: String,
    isEnd: Boolean,
    earlyEnd: Boolean,
    chatRoomList: String,
    chatType: String,
  },
);

const ChatRoom = mongoose.model("ChatRoom", ChatRoomSchema);

export default ChatRoom;
