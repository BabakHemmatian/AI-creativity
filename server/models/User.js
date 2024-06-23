import mongoose from "mongoose";

const UserSchema = mongoose.Schema(
  {
    email: String,
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

export default User;
