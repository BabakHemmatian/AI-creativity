import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import auth from "../config/firebase";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function register(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  // ✅ Ensures avatar updates show immediately and triggers React rerender
  async function updateUserProfile(user, profile) {
    // Use the live auth user if caller passed something stale
    const targetUser = auth.currentUser || user;
    if (!targetUser) throw new Error("No authenticated user");

    await updateProfile(targetUser, profile);

    // refresh auth.currentUser fields like photoURL/displayName
    if (typeof targetUser.reload === "function") {
      await targetUser.reload();
    }

    // IMPORTANT: clone to force rerender (Firebase user object is mutable)
    setCurrentUser(auth.currentUser ? { ...auth.currentUser } : null);
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user ? { ...user } : null);
      setLoading(false);
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
