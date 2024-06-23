import { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";

import auth from "../config/firebase";

import User from "../models/User"; 

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function register(email, password) {
    return createUserWithEmailAndPassword(auth, email, password).
    then(async (userCredential) => {
      const user = userCredential.user;
      // Create a new user instance for MongoDB
      const newUser = new User({
        email: user.email,
        firebaseUID: user.uid,
      });

      // Save the new user to MongoDB
      await newUser.save();
    })
    .catch((error) => {
      console.error("Error registering user:", error);
      throw error;
    });
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  function updateUserProfile(user, profile) {
    return updateProfile(user, profile);
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setLoading(false);

      if (user) {
        console.log("User Information:");
        console.log("User ID:", user.uid);
        console.log("Email:", user.email);
        console.log("Display Name:", user.displayName);
        console.log("Photo URL:", user.photoURL);

      } else {
        console.log("No user is currently signed in.");
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    error,
    setError,
    login,
    register,
    logout,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
