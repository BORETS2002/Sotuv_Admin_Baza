"use client"

import { useEffect, useState } from "react"
import { WifiOff, Wifi } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface OfflineDetectorProps {
  className?: string
  position?: "top" | "bottom"
  showOnlineStatus?: boolean
}

export function OfflineDetector({ className, position = "bottom", showOnlineStatus = false }: OfflineDetectorProps) {
  const [isOffline, setIsOffline] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)
  const [showOnlineAlert, setShowOnlineAlert] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      if (wasOffline && showOnlineStatus) {
        setShowOnlineAlert(true)
        setTimeout(() => setShowOnlineAlert(false), 3000)
      }
      setWasOffline(false)
    }

    const handleOffline = () => {
      setIsOffline(true)
      setWasOffline(true)
    }

    // Check initial state
    setIsOffline(!navigator.onLine)

    // Add event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [wasOffline, showOnlineStatus])

  const positionClasses = {
    top: "top-4",
    bottom: "bottom-4",
  }

  if (!isOffline && !showOnlineAlert) return null

  return (
    <>
      {isOffline && (
        <Alert
          variant="destructive"
          className={cn("fixed right-4 max-w-md z-50 shadow-lg", positionClasses[position], className)}
        >
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Internet aloqasi yo'q</AlertTitle>
          <AlertDescription>
            Siz hozir offline rejimdasiz. Ba'zi funksiyalar ishlamasligi mumkin. Iltimos, internet aloqangizni
            tekshiring.
          </AlertDescription>
        </Alert>
      )}

      {showOnlineAlert && !isOffline && (
        <Alert
          variant="default"
          className={cn(
            "fixed right-4 max-w-md z-50 shadow-lg bg-green-50 text-green-800 border-green-200",
            positionClasses[position],
            className,
          )}
        >
          <Wifi className="h-4 w-4" />
          <AlertTitle>Internet aloqasi tiklandi</AlertTitle>
          <AlertDescription>Siz yana onlayn rejimdasiz. Barcha funksiyalar to'liq ishlaydi.</AlertDescription>
        </Alert>
      )}
    </>
  )
}
