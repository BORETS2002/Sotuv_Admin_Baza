"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Loader2, FileQuestion } from "lucide-react"
import { cn } from "@/lib/utils"

interface DataLoaderProps {
  children: React.ReactNode
  isLoading: boolean
  isEmpty?: boolean
  emptyState?: React.ReactNode
  loadingMessage?: string
  emptyMessage?: string
  className?: string
  size?: "sm" | "md" | "lg"
}

export function DataLoader({
  children,
  isLoading,
  isEmpty = false,
  emptyState,
  loadingMessage = "Ma'lumotlar yuklanmoqda...",
  emptyMessage = "Ma'lumotlar topilmadi",
  className,
  size = "md",
}: DataLoaderProps) {
  const [showLoader, setShowLoader] = useState(isLoading)
  const [showEmptyState, setShowEmptyState] = useState(isEmpty && !isLoading)

  useEffect(() => {
    // Add a small delay before showing the loader to prevent flashing
    let loaderTimeout: NodeJS.Timeout

    if (isLoading) {
      loaderTimeout = setTimeout(() => {
        setShowLoader(true)
      }, 300)
    } else {
      setShowLoader(false)
      setShowEmptyState(isEmpty)
    }

    return () => {
      if (loaderTimeout) clearTimeout(loaderTimeout)
    }
  }, [isLoading, isEmpty])

  const sizeClasses = {
    sm: {
      container: "py-6",
      icon: "h-6 w-6",
      text: "text-xs",
    },
    md: {
      container: "py-12",
      icon: "h-8 w-8",
      text: "text-sm",
    },
    lg: {
      container: "py-16",
      icon: "h-10 w-10",
      text: "text-base",
    },
  }

  if (showLoader) {
    return (
      <div className={cn("flex items-center justify-center", sizeClasses[size].container, className)}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className={cn("animate-spin text-primary", sizeClasses[size].icon)} />
          <p className={cn("text-muted-foreground", sizeClasses[size].text)}>{loadingMessage}</p>
        </div>
      </div>
    )
  }

  if (showEmptyState) {
    return (
      <div className={cn("flex items-center justify-center", sizeClasses[size].container, className)}>
        {emptyState || (
          <div className="text-center">
            <FileQuestion className={cn("mx-auto mb-4 text-muted-foreground", sizeClasses[size].icon)} />
            <p className={cn("text-muted-foreground", sizeClasses[size].text)}>{emptyMessage}</p>
          </div>
        )}
      </div>
    )
  }

  return <>{children}</>
}
