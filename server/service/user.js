import User from "../models/User.js";

export const createUserService = async (userId, email) => {
    const newUser = new User({
        uid: userId,
        email: email
    })
    try {
        await newUser.save();
        return newUser;
    } catch (error) {
        console.log(error);
        return null;
    }
}