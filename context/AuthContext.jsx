"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const googleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      return result
    } catch (error) {
      console.error("Google Sign In Error:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await auth.signOut()
      setUser(null)
    } catch (error) {
      console.error("Logout Error:", error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, googleSignIn, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  )
} 