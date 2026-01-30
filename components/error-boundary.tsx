"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface ErrorBoundaryProps {
  children: React.ReactNode
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Global error handler
    const errorHandler = (error: ErrorEvent) => {
      console.error("Caught error:", error)
      setError(error.error)
      setHasError(true)
    }

    window.addEventListener("error", errorHandler)
    return () => window.removeEventListener("error", errorHandler)
  }, [])

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Xatolik yuz berdi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Tizimda kutilmagan xatolik yuz berdi. Iltimos, sahifani yangilang yoki administratorga murojaat qiling.
            </p>
            {error && process.env.NODE_ENV !== "production" && (
              <div className="p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-32">{error.message}</div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => {
                setHasError(false)
                setError(null)
                window.location.reload()
              }}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sahifani yangilash
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
