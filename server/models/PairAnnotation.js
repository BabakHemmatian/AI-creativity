import mongoose from "mongoose"

export const DATA_QUALITY_VALUES = [
  "unknown",
  "valid",
  "invalid",
  "needs_review",
]

export const ENVIRONMENT_VALUES = ["unknown", "lab", "classroom"]

const PairAnnotationSchema = new mongoose.Schema(
  {
    pairId: { type: String, required: true, unique: true, index: true },
    tableNumberA: { type: Number, default: null },
    tableNumberB: { type: Number, default: null },
    environment: {
      type: String,
      enum: ENVIRONMENT_VALUES,
      default: "unknown",
    },
    dataQuality: {
      type: String,
      enum: DATA_QUALITY_VALUES,
      default: "unknown",
    },
    notes: { type: String, default: "" },
    lastMatchId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
)

const PairAnnotation = mongoose.model("PairAnnotation", PairAnnotationSchema)

export default PairAnnotation
