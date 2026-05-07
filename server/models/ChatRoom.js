import mongoose from "mongoose";

const ChatRoomSchema = mongoose.Schema(
  {
    members: Array,
    instruction: String,
    isEnd: Boolean,
    earlyEnd: Boolean,
    chatRoomList: String,
    chatType: String,
    // Set exactly once when the round clock actually starts (user sends
    // "ready" for GPT/CON, or both users send "ready" for HUM).
    // A null value means the room was created but the round never started,
    // which is the authoritative "actually started" signal for analytics
    // and for deciding whether a disconnect should mark the room earlyEnd.
    startedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const ChatRoom = mongoose.model("ChatRoom", ChatRoomSchema);

export default ChatRoom;
