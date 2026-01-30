import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "@/components/error-boundary"
import { OfflineDetector } from "@/components/offline-detector"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Ombor Boshqaruv Tizimi",
  description: "Ombor va inventar boshqaruv tizimi",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <ErrorBoundary>
            <AuthProvider>
              {children}
              <Toaster />
              <OfflineDetector showOnlineStatus={true} />
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
