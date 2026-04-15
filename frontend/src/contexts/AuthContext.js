import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import auth from "../config/firebase";

const AuthContext = createContext(null);

const SESSION_MAX_MS = 60 * 60 * 1000; // 1 hour
const LOGIN_TS_KEY = "auth_login_ts";

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const logoutTimerRef = useRef(null);

  function scheduleAutoLogout() {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

    const loginTs = Number(sessionStorage.getItem(LOGIN_TS_KEY) || 0);
    if (!loginTs) return;

    const remaining = SESSION_MAX_MS - (Date.now() - loginTs);
    if (remaining <= 0) {
      signOut(auth);
      sessionStorage.removeItem(LOGIN_TS_KEY);
      return;
    }
    logoutTimerRef.current = setTimeout(() => {
      signOut(auth);
      sessionStorage.removeItem(LOGIN_TS_KEY);
    }, remaining);
  }

  async function register(email, password) {
    await setPersistence(auth, browserSessionPersistence);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    sessionStorage.setItem(LOGIN_TS_KEY, String(Date.now()));
    return cred;
  }

  async function login(email, password) {
    await setPersistence(auth, browserSessionPersistence);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    sessionStorage.setItem(LOGIN_TS_KEY, String(Date.now()));
    return cred;
  }

  function logout() {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    sessionStorage.removeItem(LOGIN_TS_KEY);
    return signOut(auth);
  }

  async function updateUserProfile(user, profile) {
    const targetUser = auth.currentUser || user;
    if (!targetUser) throw new Error("No authenticated user");

    await updateProfile(targetUser, profile);

    if (typeof targetUser.reload === "function") {
      await targetUser.reload();
    }

    setCurrentUser(auth.currentUser ? { ...auth.currentUser } : null);
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const loginTs = Number(sessionStorage.getItem(LOGIN_TS_KEY) || 0);
        if (loginTs && Date.now() - loginTs > SESSION_MAX_MS) {
          signOut(auth);
          sessionStorage.removeItem(LOGIN_TS_KEY);
          setCurrentUser(null);
          setLoading(false);
          return;
        }
        if (!loginTs) {
          sessionStorage.setItem(LOGIN_TS_KEY, String(Date.now()));
        }
        scheduleAutoLogout();
        setCurrentUser({ ...user });
      } else {
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => {
      unsubscribe();
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
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
