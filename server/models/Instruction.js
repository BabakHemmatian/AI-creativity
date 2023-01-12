import mongoose from "mongoose";

const InstructionSchema = mongoose.Schema(
  {
    text: String,
  },
);

const Instruction = mongoose.model("Instruction", InstructionSchema);

export default Instruction;
