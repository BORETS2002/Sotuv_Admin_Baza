"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import { logAdminLogout } from "@/lib/admin-logger"

type User = {
  id: string
  email: string
  role: "superadmin" | "admin" | "user"
  employee: {
    first_name: string
    last_name: string
    position: string
  }
}

type Session = {
  user: User
  expires_at: string
}

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SESSION_KEY = "warehouse_management_session"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = getSupabaseClient()

  useEffect(() => {
    // Check for session in localStorage - optimize this check
    const checkSession = () => {
      const storedSession = localStorage.getItem(SESSION_KEY)

      if (storedSession) {
        try {
          const parsedSession = JSON.parse(storedSession) as Session

          // Check if session is expired
          if (new Date(parsedSession.expires_at) > new Date()) {
            setSession(parsedSession)
            setUser(parsedSession.user)
          } else {
            // Session expired, clear it
            localStorage.removeItem(SESSION_KEY)
          }
        } catch (error) {
          console.error("Error parsing session:", error)
          localStorage.removeItem(SESSION_KEY)
        }
      }

      setIsLoading(false)
    }

    // Run immediately
    checkSession()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Tizimga kirishda xatolik yuz berdi")
      }

      const { session: newSession } = await response.json()

      // Save session to localStorage
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession))

      // Save login time for activity logging
      localStorage.setItem("userLoginTime", new Date().toISOString())

      setSession(newSession)
      setUser(newSession.user)

      return newSession
    } catch (error: any) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      // Get the user's login time from localStorage if available
      const userLoginTime = localStorage.getItem("userLoginTime")

      // Admin logout faoliyatini qayd qilish
      if (user?.id && user?.email) {
        try {
          await logAdminLogout(user.id, user.email, userLoginTime || undefined).catch((error) => {
            console.error("Error logging logout:", error)
            // Continue with logout even if logging fails
          })
        } catch (error) {
          console.error("Error logging logout:", error)
          // Continue with logout even if logging fails
        }
      }

      // Clear session from localStorage
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem("user")
      localStorage.removeItem("userLoginTime")

      setSession(null)
      setUser(null)

      // Sign out from Supabase
      await supabase.auth.signOut()

      // Redirect to login page
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
      // Force redirect to login page even if there's an error
      window.location.href = "/"
    }
  }, [router, supabase.auth, user?.id, user?.email])

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
