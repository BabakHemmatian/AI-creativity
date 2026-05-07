import mongoose from "mongoose"

const MatchSchema = mongoose.Schema(
  {
    userIdA: String,                   // Firebase uid
    userIdB: String,                   // Firebase uid
    userSessionIdA: mongoose.Schema.Types.ObjectId, // Reference to UserSession
    userSessionIdB: mongoose.Schema.Types.ObjectId, // Reference to UserSession
    status: String,                    // "active" | "ended"
    chatRoomListId: mongoose.Schema.Types.ObjectId, // Reference to ChatRoomList
    expiresAt: Date,                   // TTL field
    metadata: {
      initiatedBy: String,             // Which user triggered the match
    },
  },
  { timestamps: true }
)

// TTL index: auto-delete after expiresAt
MatchSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
// Find active matches
MatchSchema.index({ status: 1 })
// Pair lookup
MatchSchema.index({ userIdA: 1, userIdB: 1 })

const Match = mongoose.model("Match", MatchSchema)

export default Match
