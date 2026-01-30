"use client"
import { useRouter } from "next/navigation"
import { User, ChevronDown, LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { logAdminLogout } from "@/lib/admin-logger"
import { getSupabaseClient } from "@/lib/supabase-client"

interface HeaderProps {
  user: any
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const supabase = getSupabaseClient()

  // Update the handleSignOut function to include login time for better session tracking
  const handleSignOut = async () => {
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

      // Clear all user data from localStorage
      localStorage.removeItem("user")
      localStorage.removeItem("userLoginTime")
      localStorage.removeItem("warehouse_management_session")

      // Sign out from Supabase
      await supabase.auth.signOut()

      // Use router for navigation when possible
      router.push("/")

      // As a fallback, also use direct location change
      setTimeout(() => {
        window.location.href = "/"
      }, 100)
    } catch (error) {
      console.error("Error signing out:", error)
      // Force redirect to login page even if there's an error
      window.location.href = "/"
    }
  }

  const getInitials = (name: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const userName = user?.employee
    ? `${user.employee.first_name} ${user.employee.last_name}`
    : user?.email?.split("@")[0] || "Foydalanuvchi"

  const userRole = user?.role === "superadmin" ? "Super Admin" : user?.role === "admin" ? "Admin" : "Foydalanuvchi"

  const departmentName = user?.employee?.departments?.name || ""

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
      <div className="flex items-center">
        <h1 className="text-xl font-bold md:text-2xl">Ombor Boshqaruv Tizimi</h1>
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getInitials(userName)}</AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start md:flex">
                <span className="text-sm font-medium">{userName}</span>
                <span className="text-xs text-muted-foreground">
                  {userRole}
                  {departmentName ? ` - ${departmentName}` : ""}
                </span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="flex flex-col items-start">
              <span className="font-medium">{userName}</span>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
              <User className="mr-2 h-4 w-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Sozlamalar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Chiqish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
