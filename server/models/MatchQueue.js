import mongoose from "mongoose"

const MatchQueueSchema = mongoose.Schema(
  {
    userId: String,                    // Firebase uid
    userSessionId: mongoose.Schema.Types.ObjectId, // Reference to UserSession
    status: String,                    // "waiting" | "matched" | "timed_out"
    types: [String],                   // Their assigned round order
    queuedAt: Date,
    expiresAt: Date,                   // TTL field
  },
  { timestamps: true }
)

// TTL index: auto-delete after expiresAt
MatchQueueSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
// Find oldest waiting user
MatchQueueSchema.index({ status: 1, queuedAt: 1 })

const MatchQueue = mongoose.model("MatchQueue", MatchQueueSchema)

export default MatchQueue
