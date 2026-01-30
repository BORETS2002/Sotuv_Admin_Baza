import { BarChart, Building2, LayoutDashboard, ListChecks, type LucideIcon, Settings, User2, Users } from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  role?: "admin" | "superadmin"
}

export const sidebarNavItems: NavItem[] = [
  {
    title: "Bosh sahifa",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Xodimlar",
    href: "/dashboard/employees",
    icon: Users,
    role: "admin",
  },
  {
    title: "Kompaniyalar",
    href: "/dashboard/companies",
    icon: Building2,
    role: "admin",
  },
  {
    title: "Lavozimlar",
    href: "/dashboard/positions",
    icon: ListChecks,
    role: "admin",
  },
  {
    title: "Profil",
    href: "/dashboard/profile",
    icon: User2,
  },
  {
    title: "Sozlamalar",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Hisobotlar",
    href: "/dashboard/reports",
    icon: BarChart,
    role: "admin",
  },
  // "Inventar hisoboti" bo'limi olib tashlandi
]
