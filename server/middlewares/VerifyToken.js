/**
 * this file is used for firebase authentication
 */


//You can double check your credential and maybe database url in the serviceAccountKey.json file, 
//the one that had the compromised data and did changes. And maybe check if that new account key 
//has the necessary permissions in the Firebase project.

import auth from "../config/firebase-config.js";

export const VerifyToken = async (req, res, next) => {
  const Authorization_Header = req.headers.authorization;
  if (Authorization_Header)
    {  
    const token = Authorization_Header.split(" ")[1];
    try {
      const decodeValue = await auth.verifyIdToken(token);
      if (decodeValue) {
        req.user = decodeValue;
        return next();
      }
      else 
      {
        console.log("Unauthorized - VerifyToken function");
        return res.status(401).json({ message: "Unauthorized" });
      }
    } catch (e) {
      console.log("Internal Error - VerifyToken function");
      return res.status(500).json({ message: "Internal Error" });
    }
  } 
  else 
  {
    console.log("No Authorization Header - VerifyToken function");
    console.log("Request Headers: ", req.headers);
    return res.status(401).json({ message: "No Authorization Header!" });
  }
};

export const VerifySocketToken = async (socket, next) => {
  const handshake_auth = socket.handshake.auth;

  if (handshake_auth)
  {
    const token = socket.handshake.auth.token;
    try {
      const decodeValue = await auth.verifyIdToken(token);
      if (decodeValue) 
      {
        socket.user = decodeValue;
        return next();
      }
      else 
      {
        console.log("Unauthorized - VerifySocketToken function");
        return next(new Error("Unauthorized"));
      }
    } catch (e) {
      console.log("Internal Error - VerifySocketToken function");
      return next(new Error("Internal Error"));
    }
  }else
  {
    console.log("No Authorization Header - VerifySocketToken function");
    return next(new Error("No Authorization Header"));
  }
};
