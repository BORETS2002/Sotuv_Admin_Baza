"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Download, RefreshCw, BarChart, Clock, Package, User, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Simplified types
type AdminActivity = {
  id: string
  user_id: string
  action_type: string
  action_details: any
  entity_type: string | null
  entity_id: string | null
  ip_address: string
  created_at: string
  user: {
    email: string
    full_name: string | null
    employee: {
      first_name: string
      last_name: string
      position: string
    } | null
  } | null
}

type AdminStats = {
  totalActivities: number
  loginCount: number
  logoutCount: number
  itemIssueCount: number
  itemReceiveCount: number
  uniqueAdmins: number
  todayActivities: number
}

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState<AdminActivity[]>([])
  const [loginActivities, setLoginActivities] = useState<AdminActivity[]>([])
  const [itemActivities, setItemActivities] = useState<AdminActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingMockData, setUsingMockData] = useState(false)
  const [stats, setStats] = useState<AdminStats>({
    totalActivities: 0,
    loginCount: 0,
    logoutCount: 0,
    itemIssueCount: 0,
    itemReceiveCount: 0,
    uniqueAdmins: 0,
    todayActivities: 0,
  })
  const [uniqueAdmins, setUniqueAdmins] = useState<{ id: string; email: string; name?: string }[]>([])
  const router = useRouter()

  // Simplified initialization - always use mock data in preview environment
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Always use mock data in preview to avoid chunk loading errors
        const mockActivities = generateMockActivities()
        processActivities(mockActivities)
        setUsingMockData(true)
        setLoading(false)
      } catch (error) {
        console.error("Error during initialization:", error)
        setError("Ma'lumotlarni yuklashda xatolik yuz berdi")
        setLoading(false)
      }
    }

    initializeData()
  }, [])

  // Simplified refresh function - always use mock data in preview
  const fetchActivities = async () => {
    setLoading(true)
    setError(null)

    try {
      // Generate new mock data for refresh
      const mockActivities = generateMockActivities()
      processActivities(mockActivities)
      setUsingMockData(true)
    } catch (error: any) {
      console.error("Error refreshing data:", error)
      setError("Ma'lumotlarni yangilashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  // Process activities data and update state
  function processActivities(data: AdminActivity[]) {
    if (!data) {
      data = []
    }

    // Transform the data to match the expected structure
    const transformedData = data.map((item) => ({
      ...item,
      user: item.users || item.user,
    }))

    setActivities(transformedData)

    // Extract login/logout activities
    const loginData = transformedData
      .filter((item) => ["login", "logout"].includes(item.action_type))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setLoginActivities(loginData)

    // Extract item transaction activities
    const itemData = transformedData
      .filter((item) => ["issue_item", "receive_item"].includes(item.action_type))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setItemActivities(itemData)

    // Calculate statistics
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const uniqueAdminIds = [...new Set(transformedData.map((item) => item.user_id))]

    const todayActivities = transformedData.filter((item) => {
      const activityDate = new Date(item.created_at)
      return activityDate >= today
    })

    setStats({
      totalActivities: transformedData.length,
      loginCount: transformedData.filter((item) => item.action_type === "login").length,
      logoutCount: transformedData.filter((item) => item.action_type === "logout").length,
      itemIssueCount: transformedData.filter((item) => item.action_type === "issue_item").length,
      itemReceiveCount: transformedData.filter((item) => item.action_type === "receive_item").length,
      uniqueAdmins: uniqueAdminIds.length,
      todayActivities: todayActivities.length,
    })
  }

  // Helper function to generate mock data
  function generateMockActivities(): AdminActivity[] {
    const mockUsers = [
      {
        id: "1",
        email: "admin@example.com",
        full_name: "Admin User",
        employee: { first_name: "Admin", last_name: "User", position: "SuperAdmin" },
      },
      {
        id: "2",
        email: "manager@example.com",
        full_name: "Manager User",
        employee: { first_name: "Manager", last_name: "User", position: "Admin" },
      },
    ]

    setUniqueAdmins(
      mockUsers.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.employee ? `${user.employee.first_name} ${user.employee.last_name}` : user.full_name,
      })),
    )

    const actionTypes = ["login", "logout", "issue_item", "receive_item", "create_user", "update_item"]
    const entityTypes = ["user", "item", "transaction"]

    return Array(50)
      .fill(0)
      .map((_, index) => {
        const user = mockUsers[Math.floor(Math.random() * mockUsers.length)]
        const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)]
        const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)]
        const daysAgo = Math.floor(Math.random() * 30)
        const hoursAgo = Math.floor(Math.random() * 24)
        const minutesAgo = Math.floor(Math.random() * 60)

        const date = new Date()
        date.setDate(date.getDate() - daysAgo)
        date.setHours(date.getHours() - hoursAgo)
        date.setMinutes(date.getMinutes() - minutesAgo)

        return {
          id: `mock-${index}`,
          user_id: user.id,
          action_type: actionType,
          action_details: {
            mock: true,
            item_name: actionType.includes("item") ? "Test Item " + (index % 10) : undefined,
            item_id: actionType.includes("item") ? `item-${index % 20}` : undefined,
            employee_name: actionType.includes("item") ? "Test Employee " + (index % 5) : undefined,
            employee_id: actionType.includes("item") ? `emp-${index % 10}` : undefined,
            timestamp: date.toISOString(),
          },
          entity_type: entityType,
          entity_id: `entity-${index}`,
          ip_address: `192.168.1.${index % 255}`,
          created_at: date.toISOString(),
          user: user,
        }
      })
  }

  // Function to export activities as CSV
  const downloadCSV = (data: any[], filename: string, columns: { key: string; label: string }[]) => {
    // Create CSV header
    let csv = columns.map((col) => col.label).join(",") + "\n"

    // Add each activity as a row
    data.forEach((item) => {
      const row = columns
        .map((col) => {
          let value = ""
          if (col.key.includes(".")) {
            // Handle nested properties
            const keys = col.key.split(".")
            let nestedValue = item
            for (const key of keys) {
              nestedValue = nestedValue?.[key]
              if (nestedValue === undefined) break
            }
            value = nestedValue !== undefined ? String(nestedValue) : ""
          } else {
            // Handle direct properties
            value = item[col.key] !== undefined ? String(item[col.key]) : ""
          }
          // Escape quotes and wrap in quotes
          return `"${value.replace(/"/g, '""')}"`
        })
        .join(",")
      csv += row + "\n"
    })

    // Create and download the CSV file
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Function to get badge color based on action type
  const getActionBadgeColor = (actionType: string) => {
    if (actionType.startsWith("create")) return "bg-green-100 text-green-800"
    if (actionType.startsWith("update")) return "bg-blue-100 text-blue-800"
    if (actionType.startsWith("delete")) return "bg-red-100 text-red-800"
    if (actionType === "login") return "bg-purple-100 text-purple-800"
    if (actionType === "logout") return "bg-gray-100 text-gray-800"
    if (actionType.includes("issue")) return "bg-yellow-100 text-yellow-800"
    if (actionType.includes("receive")) return "bg-indigo-100 text-indigo-800"
    return "bg-gray-100 text-gray-800"
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("uz-UZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    } catch (e) {
      return dateString
    }
  }

  // Get user display name
  const getUserDisplayName = (user: any) => {
    if (!user) return "Noma'lum"

    if (user.employee) {
      return `${user.employee.last_name} ${user.employee.first_name}`
    }

    return user.full_name || user.email
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin faoliyatlari</h1>
          <p className="text-muted-foreground">Tizimda adminlar tomonidan amalga oshirilgan barcha harakatlar</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchActivities()} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Yangilash
          </Button>
          <Button
            onClick={() =>
              downloadCSV(activities, "admin_faoliyatlari", [
                { key: "created_at", label: "Sana" },
                { key: "user.email", label: "Admin" },
                { key: "action_type", label: "Harakat turi" },
                { key: "entity_type", label: "Obyekt turi" },
                { key: "ip_address", label: "IP manzil" },
              ])
            }
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            CSV yuklab olish
          </Button>
          <Button
            onClick={() => router.push("/dashboard/admin-activities/reports")}
            variant="default"
            className="flex items-center gap-2"
          >
            <BarChart className="h-4 w-4" />
            Hisobotlar
          </Button>
        </div>
      </div>

      {/* Show warning for mock data */}
      {usingMockData && (
        <Alert variant="warning" className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">{error || "Demo ma'lumotlar ko'rsatilmoqda."}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jami faoliyatlar</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalActivities}</div>
            )}
            <p className="text-xs text-muted-foreground">Bugun: {stats.todayActivities}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kirish/Chiqish</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.loginCount + stats.logoutCount}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Kirish: {stats.loginCount}, Chiqish: {stats.logoutCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mahsulot operatsiyalari</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.itemIssueCount + stats.itemReceiveCount}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Berish: {stats.itemIssueCount}, Qabul: {stats.itemReceiveCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faol adminlar</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.uniqueAdmins}</div>
            )}
            <p className="text-xs text-muted-foreground">Jami: {uniqueAdmins.length} ta admin</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="login">
            <TabsList className="mb-4">
              <TabsTrigger value="login">Kirish/Chiqish</TabsTrigger>
              <TabsTrigger value="items">Mahsulot operatsiyalari</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <div className="space-y-4">
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-3 text-left">Sana</th>
                          <th className="px-4 py-3 text-left">Admin</th>
                          <th className="px-4 py-3 text-left">Harakat</th>
                          <th className="px-4 py-3 text-left">IP manzil</th>
                          <th className="px-4 py-3 text-left">Sessiya davomiyligi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          Array(5)
                            .fill(0)
                            .map((_, i) => (
                              <tr key={i} className="border-b">
                                <td className="px-4 py-3">
                                  <Skeleton className="h-4 w-24" />
                                </td>
                                <td className="px-4 py-3">
                                  <Skeleton className="h-4 w-32" />
                                </td>
                                <td className="px-4 py-3">
                                  <Skeleton className="h-4 w-20" />
                                </td>
                                <td className="px-4 py-3">
                                  <Skeleton className="h-4 w-24" />
                                </td>
                                <td className="px-4 py-3">
                                  <Skeleton className="h-4 w-24" />
                                </td>
                              </tr>
                            ))
                        ) : loginActivities.length > 0 ? (
                          loginActivities.map((activity) => (
                            <tr key={activity.id} className="border-b">
                              <td className="px-4 py-3">{formatDate(activity.created_at)}</td>
                              <td className="px-4 py-3">
                                {getUserDisplayName(activity.user)}
                                {activity.user?.email && (
                                  <div className="text-xs text-muted-foreground">{activity.user.email}</div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={cn("font-normal", getActionBadgeColor(activity.action_type))}>
                                  {activity.action_type === "login" ? "Tizimga kirish" : "Tizimdan chiqish"}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">{activity.ip_address}</td>
                              <td className="px-4 py-3">
                                {activity.action_type === "logout" && activity.action_details?.login_time
                                  ? calculateSessionDuration(activity.action_details.login_time, activity.created_at)
                                  : activity.action_type === "login"
                                    ? "Faol sessiya"
                                    : "-"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-3 text-center text-muted-foreground">
                              Kirish/Chiqish faoliyatlari topilmadi
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="items">
              <div className="space-y-4">
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-3 text-left">Sana</th>
                          <th className="px-4 py-3 text-left">Admin</th>
                          <th className="px-4 py-3 text-left">Harakat</th>
                          <th className="px-4 py-3 text-left">Mahsulot</th>
                          <th className="px-4 py-3 text-left">Xodim</th>
                          <th className="px-4 py-3 text-left">Izoh</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          Array(5)
                            .fill(0)
                            .map((_, i) => (
                              <tr key={i} className="border-b">
                                <td className="px-4 py-3">
                                  <Skeleton className="h-4 w-24" />
                                </td>
                                <td className="px-4 py-3">
                                  <Skeleton className="h-4 w-32" />
                                </td>
                                <td className="px-4 py-3">
                                  <Skeleton className="h-4 w-20" />
                                </td>
                                <td className="px-4 py-3">
                                  <Skeleton className="h-4 w-48" />
                                </td>
                                <td className="px-4 py-3">
                                  <Skeleton className="h-4 w-24" />
                                </td>
                                <td className="px-4 py-3">
                                  <Skeleton className="h-4 w-24" />
                                </td>
                              </tr>
                            ))
                        ) : itemActivities.length > 0 ? (
                          itemActivities.map((activity) => (
                            <tr key={activity.id} className="border-b">
                              <td className="px-4 py-3">{formatDate(activity.created_at)}</td>
                              <td className="px-4 py-3">
                                {getUserDisplayName(activity.user)}
                                {activity.user?.email && (
                                  <div className="text-xs text-muted-foreground">{activity.user.email}</div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={cn("font-normal", getActionBadgeColor(activity.action_type))}>
                                  {activity.action_type === "issue_item" ? "Mahsulot berish" : "Mahsulot qabul qilish"}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                {activity.action_details?.item_name || "Noma'lum"}
                                {activity.action_details?.item_id && (
                                  <div className="text-xs text-muted-foreground">
                                    ID: {activity.action_details.item_id}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {activity.action_details?.employee_name || "Noma'lum"}
                                {activity.action_details?.employee_id && (
                                  <div className="text-xs text-muted-foreground">
                                    ID: {activity.action_details.employee_id}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">{activity.action_details?.notes || "-"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-3 text-center text-muted-foreground">
                              Mahsulot operatsiyalari topilmadi
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">Demo ma'lumotlar: {new Date().toLocaleString("uz-UZ")}</p>
            <Button variant="outline" size="sm" onClick={() => fetchActivities()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Yangilash
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

// Helper function to calculate session duration
function calculateSessionDuration(loginTime: string, logoutTime: string) {
  try {
    const login = new Date(loginTime)
    const logout = new Date(logoutTime)

    // Check for invalid dates
    if (isNaN(login.getTime()) || isNaN(logout.getTime())) {
      return "-"
    }

    // Check if logout is before login (shouldn't happen, but just in case)
    if (logout < login) {
      return "-"
    }

    const diffMs = logout.getTime() - login.getTime()
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000)

    if (diffHrs > 0) {
      return `${diffHrs} soat ${diffMins} daqiqa`
    } else if (diffMins > 0) {
      return `${diffMins} daqiqa ${diffSecs} soniya`
    } else {
      return `${diffSecs} soniya`
    }
  } catch (e) {
    console.error("Error calculating session duration:", e)
    return "-"
  }
}
