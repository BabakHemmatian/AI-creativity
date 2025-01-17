/**
 * the file is used to get the use object from firebase
 */
import auth from "../config/firebase-config.js";
import User from "../models/User.js";


export const createUser = async (req, res) => {
  try {
    console.log('Attempting to create user:', req.body);
    const newUser = new User({
      _id: req.body._id,
      email: req.body.email
    });
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    console.log('error');
    res.status(409).json({
      message: error.message,
    });
  }
};

//get all the users 
export const getAllUsers = async (req, res) => {
  const maxResults = 10;
  let users = [];

  try {
    const userRecords = await auth.listUsers(maxResults);

    userRecords.users.forEach((user) => {
      const { uid, email, displayName, photoURL } = user;
      users.push({ uid, email, displayName, photoURL });
    });
    res.status(200).json(users);
  } catch (error) {
    console.log(error);
  }
};

//get the user with that id
export const getUser = async (req, res) => {
  try {
    const userRecord = await auth.getUser(req.params.userId);
    
    const { uid, email, displayName, photoURL } = userRecord;

    res.status(200).json({ uid, email, displayName, photoURL });
  } catch (error) {
    console.log(error);
  }
};
