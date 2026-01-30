"use client"

import type React from "react"
import { useState, useEffect, useCallback, lazy, Suspense } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X, Loader2 } from "lucide-react"
import { Header } from "@/components/dashboard/header"
import { getSupabaseClient } from "@/lib/supabase-client"
import { ErrorBoundary } from "@/components/error-boundary"
import { OfflineDetector } from "@/components/offline-detector"
import { getUser, setupSessionMonitoring, clearSession } from "@/lib/session-manager"

// Lazy load the Sidebar component
const Sidebar = lazy(() => import("@/components/dashboard/sidebar").then((mod) => ({ default: mod.Sidebar })))

// Loading fallback component for lazy loaded components
const LoadingFallback = () => <div className="w-64 h-screen bg-white animate-pulse opacity-70"></div>

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = getSupabaseClient()

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("mobile-sidebar")
      if (sidebar && !sidebar.contains(event.target as Node) && isSidebarOpen) {
        setIsSidebarOpen(false)
      }
    }

    // Only add listener on mobile
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isSidebarOpen])

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false)
    }
  }, [pathname])

  // Setup session monitoring
  useEffect(() => {
    const cleanupSessionMonitoring = setupSessionMonitoring()
    return cleanupSessionMonitoring
  }, [])

  // Optimize user data fetching
  useEffect(() => {
    const getUserData = () => {
      try {
        const userData = getUser()
        if (userData) {
          setUser(userData)
        } else {
          // Redirect to login immediately
          router.push("/")
          return
        }
      } catch (error) {
        console.error("Error fetching user:", error)
        router.push("/")
        return
      }

      // Set loading to false only after user data is processed
      setIsLoading(false)
    }

    // Run immediately
    getUserData()
  }, [router])

  // Memoize sign out function to prevent unnecessary re-renders
  const handleSignOut = useCallback(async () => {
    try {
      // Clear session data
      clearSession()

      // Sign out from Supabase
      await supabase.auth.signOut()

      // Redirect to login page
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
      // Force redirect to login page even if there's an error
      window.location.href = "/"
    }
  }, [router, supabase.auth])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-100">
        {/* Mobile sidebar toggle */}
        <div className="fixed top-4 left-4 z-50 md:hidden">
          <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Sidebar with lazy loading */}
        <div id="mobile-sidebar">
          <Suspense fallback={<LoadingFallback />}>
            <Sidebar
              user={user}
              pathname={pathname}
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
            />
          </Suspense>
        </div>

        {/* Main content */}
        <div className="flex-1 md:ml-64 flex flex-col">
          <Header user={user} onSignOut={handleSignOut} />
          <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
        </div>

        {/* Offline detector */}
        <OfflineDetector />
      </div>
    </ErrorBoundary>
  )
}
