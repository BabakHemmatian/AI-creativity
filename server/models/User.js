import mongoose from "mongoose";

const UserSchema = mongoose.Schema(
  {
    _id: String,
    email: String
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

export default User;
