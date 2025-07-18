"use client"

import { createContext, useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { STORAGE_TYPE, ACCESS_TOKEN, USER_DATA } from "../constant"

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storageType = await AsyncStorage.getItem(STORAGE_TYPE)
        let token = null
        let storedUser = null

        if (storageType === "local") {
          token = await AsyncStorage.getItem(ACCESS_TOKEN)
          storedUser = await AsyncStorage.getItem(USER_DATA)
        } else {
          // Default to session if not explicitly local, or if storageType is null/session
          token = await AsyncStorage.getItem(ACCESS_TOKEN)
          storedUser = await AsyncStorage.getItem(USER_DATA)
        }

        if (token && storedUser) {
          setUser(JSON.parse(storedUser))
        } else {
          setUser(null)
        }
      } catch (e) {
        console.error("Failed to load user from storage", e)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const updateUser = async (updatedUserData) => {
    try {
      console.log("Updating user with:", updatedUserData)
      await AsyncStorage.setItem(USER_DATA, JSON.stringify(updatedUserData))
      setUser(updatedUserData)
      console.log("User updated in storage and state")
    } catch (err) {
      console.error("Error updating user data:", err)
    }
  }

  const login = async (token, userData, rememberMe) => {
    try {
      if (!token || typeof token !== "string") {
        throw new Error("Invalid token format")
      }

      await AsyncStorage.setItem(ACCESS_TOKEN, token)
      await AsyncStorage.setItem(USER_DATA, JSON.stringify(userData))
      await AsyncStorage.setItem(STORAGE_TYPE, rememberMe ? "local" : "session")

      setUser(userData)
    } catch (err) {
      console.error("Login error:", err)
      await logout() // Ensure logout on error
      throw err
    }
  }

  const logout = async () => {
    console.log("🚪 Logging out...")
    try {
      await AsyncStorage.removeItem(ACCESS_TOKEN)
      await AsyncStorage.removeItem(USER_DATA)
      await AsyncStorage.removeItem("user_id") // Assuming this was also stored
      await AsyncStorage.removeItem(STORAGE_TYPE)
      setUser(null)
    } catch (e) {
      console.error("Error during logout", e)
    }
  }

  return <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>{children}</AuthContext.Provider>
}

export default AuthProvider
