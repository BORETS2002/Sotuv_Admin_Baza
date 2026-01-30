"use client"

import { useEffect, useState } from "react"
import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"

export default function Home() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    // Check if user is already logged in - optimize this check
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem("user")
        if (userData) {
          // Redirect immediately without setting state
          router.push("/dashboard")
        }
      } catch (error) {
        console.error("Error checking authentication:", error)
      }
      setIsCheckingAuth(false)
    }

    // Run auth check immediately
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Demo foydalanuvchilar uchun tezkor kirish - optimize login process
      if (email === "admin@example.com" && password === "password123") {
        const demoUser = {
          id: "00000000-0000-0000-0000-000000000001",
          email: "admin@example.com",
          role: "superadmin",
          employee: {
            first_name: "Admin",
            last_name: "Super",
            position: "SuperAdmin",
          },
        }

        // Save login time for activity logging
        localStorage.setItem("userLoginTime", new Date().toISOString())
        localStorage.setItem("user", JSON.stringify(demoUser))

        // Redirect immediately without delay
        router.push("/dashboard")
        return
      } else if (email === "bobur@example.com" && password === "password123") {
        const demoUser = {
          id: "00000000-0000-0000-0000-000000000002",
          email: "bobur@example.com",
          role: "admin",
          employee: {
            first_name: "Bobur",
            last_name: "Adminov",
            position: "Admin",
          },
        }

        // Save login time for activity logging
        localStorage.setItem("userLoginTime", new Date().toISOString())
        localStorage.setItem("user", JSON.stringify(demoUser))

        // Redirect immediately without delay
        router.push("/dashboard")
        return
      }

      // Boshqa foydalanuvchilar uchun
      setError("Email yoki parol noto'g'ri")
    } catch (error: any) {
      console.error("Login error:", error)
      setError(error.message || "Tizimga kirishda xatolik yuz berdi")
    } finally {
      setIsLoading(false)
    }
  }

  // Agar autentifikatsiya tekshirilayotgan bo'lsa
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Ombor Boshqaruv Tizimi</CardTitle>
          <CardDescription className="text-center">
            Tizimga kirish uchun ma&apos;lumotlaringizni kiriting
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Parol</Label>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="text-sm text-gray-500">
              <p>Test foydalanuvchilar:</p>
              <p>Superadmin: admin@example.com / password123</p>
              <p>Admin: bobur@example.com / password123</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kirish...
                </span>
              ) : (
                "Kirish"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
