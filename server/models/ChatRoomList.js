import mongoose from "mongoose";

const ChatRoomListSchema = mongoose.Schema(
  {
    user: String,
    chatTypes: Array,
    chatRooms: Array,
  },
  { timestamps: true }
);

const ChatRoomList = mongoose.model("ChatRoomList", ChatRoomListSchema);

export default ChatRoomList;
