"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { redirect } from "next/navigation";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const googleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result;
    } catch (error) {
      console.error("Google Sign In Error:", error);
      throw error;
    }
  };

  const signUpWithEmailAndPassword = async (email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential;
    } catch (error) {
      console.error("Sign Up Error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(false);
      redirect("/");
    } catch (error) {
      console.error("Logout Error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, googleSignIn, signUpWithEmailAndPassword, logout }}
    >
      {loading ? (
        <div className="flex justify-center items-center text-center w-full h-[100vh] text-xl font-semibold">
          Loading...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
