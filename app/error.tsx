"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error)
  }, [error])

  // Redirect xatoligini tekshiramiz
  if (error.message === "NEXT_REDIRECT" || error.message.includes("Redirect")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="text-center space-y-6 max-w-md">
          <h2 className="text-2xl font-semibold text-gray-700">Sahifaga yo'naltirilmoqda...</h2>
          <p className="text-gray-500">Iltimos, kuting yoki quyidagi tugmani bosing.</p>
          <div className="flex justify-center pt-4">
            <Button asChild className="gap-2">
              <Link href="/login">
                <Home className="h-4 w-4" />
                Login sahifasiga
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <AlertTriangle className="h-16 w-16 text-red-500" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-700">Xatolik yuz berdi</h2>
        <p className="text-gray-500">
          Dasturda kutilmagan xatolik yuz berdi. Iltimos, sahifani yangilang yoki login sahifasiga qayting.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button onClick={reset} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Qayta yuklash
          </Button>
          <Button asChild className="gap-2">
            <Link href="/login">
              <Home className="h-4 w-4" />
              Login sahifasiga
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
