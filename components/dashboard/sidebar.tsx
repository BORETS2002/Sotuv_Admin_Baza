"use client"

import { useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Warehouse, Home, Users, Package, FileText, LogOut, ChevronDown, Layers, ShoppingCart, Send, ReceiptCent as ReceiptCheck, Activity, Shield, FileBarChart2, Lock, FileCheck2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { logAdminLogout } from "@/lib/admin-logger"

interface SidebarProps {
  user: any
  pathname: string
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
}

export function Sidebar({ user, pathname, isSidebarOpen, setIsSidebarOpen }: SidebarProps) {
  const router = useRouter()
  const supabase = getSupabaseClient()
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    inventory: true,
    management: true,
    reports: true,
    orders: true,
    superadmin: true,
  })

  // Memoize user roles to prevent recalculations
  const { isSuperAdmin, isAdmin } = useMemo(() => {
    const isSuperAdmin = user?.role === "superadmin"
    return {
      isSuperAdmin,
      isAdmin: isSuperAdmin || user?.role === "admin",
    }
  }, [user?.role])

  // Optimize toggle function
  const toggleCollapsible = useCallback((key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // Optimize sign out function
  const handleSignOut = useCallback(async () => {
    try {
      // Get the user's login time from localStorage if available
      const userLoginTime = localStorage.getItem("userLoginTime")

      // Admin logout faoliyatini qayd qilish
      if (user?.id && user?.email) {
        try {
          await logAdminLogout(user.id, user.email, userLoginTime || undefined).catch((error) => {
            console.error("Error logging logout:", error)
          })
        } catch (error) {
          console.error("Error logging logout:", error)
        }
      }

      // Clear all user data from localStorage
      localStorage.removeItem("user")
      localStorage.removeItem("userLoginTime")
      localStorage.removeItem("warehouse_management_session")

      // Sign out from both Supabase clients to ensure complete logout
      await Promise.all([supabase.auth.signOut(), supabaseClient.auth.signOut()])

      // Use router for navigation
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
      window.location.href = "/"
    }
  }, [router, supabase.auth, supabaseClient.auth, user?.id, user?.email])

  // Optimize active path checking
  const isActive = useCallback((path: string) => pathname === path, [pathname])

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex flex-col h-full">
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setIsSidebarOpen(false)}>
            <Warehouse className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Ombor Tizimi</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="flex flex-col gap-1">
            <Link href="/dashboard" onClick={() => setIsSidebarOpen(false)}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2 text-lg font-medium",
                  isActive("/dashboard") && "bg-primary/10 text-primary",
                )}
              >
                <Home className="h-5 w-5" />
                Bosh sahifa
              </Button>
            </Link>

            {isAdmin && (
              <Collapsible open={openItems.orders} onOpenChange={() => toggleCollapsible("orders")} className="w-full">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-lg font-medium">
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Buyurtmalar
                    </span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", openItems.orders && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 pt-1">
                  <div className="flex flex-col gap-1">
                    <Link href="/dashboard/orders/issue" onClick={() => setIsSidebarOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-2 text-base",
                          isActive("/dashboard/orders/issue") && "bg-primary/10 text-primary",
                        )}
                      >
                        <Send className="h-4 w-4" />
                        Buyurtma berish
                      </Button>
                    </Link>
                    <Link href="/dashboard/orders/receive" onClick={() => setIsSidebarOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-2 text-base",
                          isActive("/dashboard/orders/receive") && "bg-primary/10 text-primary",
                        )}
                      >
                        <ReceiptCheck className="h-4 w-4" />
                        Buyurtma qabul
                      </Button>
                    </Link>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Rest of the sidebar code remains the same */}
            <Collapsible
              open={openItems.inventory}
              onOpenChange={() => toggleCollapsible("inventory")}
              className="w-full"
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-lg font-medium">
                  <span className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Ombor
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", openItems.inventory && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 pt-1">
                <div className="flex flex-col gap-1">
                  <Link href="/dashboard/items" onClick={() => setIsSidebarOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 text-base",
                        isActive("/dashboard/items") && "bg-primary/10 text-primary",
                      )}
                    >
                      <Package className="h-4 w-4" />
                      Buyumlar
                    </Button>
                  </Link>
                  <Link href="/dashboard/transactions" onClick={() => setIsSidebarOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 text-base",
                        isActive("/dashboard/transactions") && "bg-primary/10 text-primary",
                      )}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Operatsiyalar
                    </Button>
                  </Link>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Faqat SuperAdmin uchun boshqaruv */}
            {isSuperAdmin && (
              <Collapsible
                open={openItems.management}
                onOpenChange={() => toggleCollapsible("management")}
                className="w-full"
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-lg font-medium">
                    <span className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Boshqaruv
                    </span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", openItems.management && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 pt-1">
                  <div className="flex flex-col gap-1">
                    <Link href="/dashboard/employees" onClick={() => setIsSidebarOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-2 text-base",
                          isActive("/dashboard/employees") && "bg-primary/10 text-primary",
                        )}
                      >
                        <Users className="h-4 w-4" />
                        Hodimlar
                      </Button>
                    </Link>
                    <Link href="/dashboard/departments" onClick={() => setIsSidebarOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-2 text-base",
                          isActive("/dashboard/departments") && "bg-primary/10 text-primary",
                        )}
                      >
                        <Layers className="h-4 w-4" />
                        Bo&apos;limlar
                      </Button>
                    </Link>
                    {/* Removed Users Link */}
                    <Link href="/dashboard/admin-activities" onClick={() => setIsSidebarOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-2 text-base",
                          isActive("/dashboard/admin-activities") && "bg-primary/10 text-primary",
                        )}
                      >
                        <Activity className="h-4 w-4" />
                        Admin faoliyatlari
                      </Button>
                    </Link>
                    <Link href="/dashboard/permissions" onClick={() => setIsSidebarOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-2 text-base",
                          isActive("/dashboard/permissions") && "bg-primary/10 text-primary",
                        )}
                      >
                        <Lock className="h-4 w-4" />
                        Ruxsatlar
                      </Button>
                    </Link>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Oddiy adminlar uchun hisobotlar */}
            {isAdmin && !isSuperAdmin && (
              <Collapsible
                open={openItems.reports}
                onOpenChange={() => toggleCollapsible("reports")}
                className="w-full"
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-lg font-medium">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Hisobotlar
                    </span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", openItems.reports && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 pt-1">
                  <div className="flex flex-col gap-1">
                    <Link href="/dashboard/reports" onClick={() => setIsSidebarOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-2 text-base",
                          isActive("/dashboard/reports") && "bg-primary/10 text-primary",
                        )}
                      >
                        <FileText className="h-4 w-4" />
                        Barcha hisobotlar
                      </Button>
                    </Link>
                    <Link href="/dashboard/reports/create" onClick={() => setIsSidebarOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-2 text-base",
                          isActive("/dashboard/reports/create") && "bg-primary/10 text-primary",
                        )}
                      >
                        <FileCheck2 className="h-4 w-4" />
                        Hisobot yaratish
                      </Button>
                    </Link>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* SuperAdmin uchun hisobotlar - faqat kerakli linklar bilan */}
            {isSuperAdmin && (
              <Collapsible
                open={openItems.reports}
                onOpenChange={() => toggleCollapsible("reports")}
                className="w-full"
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-lg font-medium">
                    <span className="flex items-center gap-2">
                      <FileBarChart2 className="h-5 w-5" />
                      Hisobotlar
                    </span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", openItems.reports && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 pt-1">
                  <div className="flex flex-col gap-1">
                    <Link href="/dashboard/reports" onClick={() => setIsSidebarOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-2 text-base",
                          isActive("/dashboard/reports") && "bg-primary/10 text-primary",
                        )}
                      >
                        <FileText className="h-4 w-4" />
                        Barcha hisobotlar
                      </Button>
                    </Link>
                    <Link href="/dashboard/reports/create" onClick={() => setIsSidebarOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-2 text-base",
                          isActive("/dashboard/reports/create") && "bg-primary/10 text-primary",
                        )}
                      >
                        <FileCheck2 className="h-4 w-4" />
                        Hisobot yaratish
                      </Button>
                    </Link>
                    <Link href="/dashboard/admin-activities/reports" onClick={() => setIsSidebarOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-2 text-base",
                          isActive("/dashboard/admin-activities/reports") && "bg-primary/10 text-primary",
                        )}
                      >
                        <Activity className="h-4 w-4" />
                        Admin faoliyatlari
                      </Button>
                    </Link>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </nav>
        </ScrollArea>
        <div className="border-t p-4">
          <Button variant="ghost" className="w-full justify-start gap-2 text-lg font-medium" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
            Chiqish
          </Button>
        </div>
      </div>
    </div>
  )
}
