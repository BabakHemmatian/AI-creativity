import mongoose from "mongoose"

const UserSessionSchema = mongoose.Schema(
  {
    userId: String,                    // Firebase uid
    phase: String,                     // "waiting" | "matched" | "in_round" | "round_ended" | "completed" | "abandoned"
    currentI: Number,                  // 0, 1, 2 (round index); -1 when idle
    types: [String],                   // e.g., ["CON", "HUM", "GPT"]
    items: [String],                   // e.g., [item0, item1, item2]
    matchedUserId: String,             // Firebase uid of partner (or null)
    matchId: mongoose.Schema.Types.ObjectId, // Reference to Match document
    currentChatRoomId: String,         // MongoDB ChatRoom._id
    currentChatRoomListId: String,     // MongoDB ChatRoomList._id
    roundStartedAt: Date,              // Server time when round started
    createdAt: Date,
    lastActivityAt: Date,
    expiresAt: Date,                   // TTL field
    disconnecttime: Date,              // When user went offline
    conMes: [String],                   // Shuffled CON responses for current round
    tags: [String],                    // Metadata: ["error_code", "retry_count"]
  },
  { timestamps: true }
)

// TTL index: auto-delete after expiresAt
UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
// Quick lookup by user
UserSessionSchema.index({ userId: 1 })

const UserSession = mongoose.model("UserSession", UserSessionSchema)

export default UserSession
