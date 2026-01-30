"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error:", error)
  }, [error])

  return (
    <html lang="uz">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
          <div className="text-center space-y-6 max-w-md">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-red-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-700">Jiddiy xatolik yuz berdi</h2>
            <p className="text-gray-500">
              Dasturda jiddiy xatolik yuz berdi. Iltimos, sahifani yangilang yoki keyinroq qayta urinib ko'ring.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button onClick={reset} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Qayta yuklash
              </Button>
              <Button onClick={() => (window.location.href = "/dashboard")} className="gap-2">
                <Home className="h-4 w-4" />
                Bosh sahifaga
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
