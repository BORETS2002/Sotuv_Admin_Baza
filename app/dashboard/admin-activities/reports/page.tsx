"use client"

import { useState, useEffect } from "react"
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

type ActivityCount = {
  action_type: string
  count: number
}

type EntityCount = {
  entity_type: string
  count: number
}

type UserActivityCount = {
  user_id: string
  email: string
  full_name: string | null
  count: number
}

type TimeSeriesData = {
  date: string
  count: number
}

export default function AdminActivityReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionTypeCounts, setActionTypeCounts] = useState<ActivityCount[]>([])
  const [entityTypeCounts, setEntityTypeCounts] = useState<EntityCount[]>([])
  const [userActivityCounts, setUserActivityCounts] = useState<UserActivityCount[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [timeRange, setTimeRange] = useState<string>("7days")

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d", "#ffc658", "#8dd1e1"]

  useEffect(() => {
    fetchReportData()
  }, [timeRange])

  async function fetchReportData() {
    setLoading(true)
    setError(null)
    try {
      const supabase = getSupabaseClient()

      // Calculate date range based on selected time range
      let startDate: Date
      let endDate = new Date()

      switch (timeRange) {
        case "7days":
          startDate = subDays(new Date(), 7)
          break
        case "30days":
          startDate = subDays(new Date(), 30)
          break
        case "month":
          startDate = startOfMonth(new Date())
          endDate = endOfMonth(new Date())
          break
        case "week":
          startDate = startOfWeek(new Date())
          endDate = endOfWeek(new Date())
          break
        default:
          startDate = subDays(new Date(), 7)
      }

      // Format dates for Supabase query
      const startDateStr = startDate.toISOString()
      const endDateStr = endDate.toISOString()

      // Check if we're in a development/preview environment
      const isMockEnvironment = process.env.NODE_ENV === "development" || !process.env.NEXT_PUBLIC_SUPABASE_URL

      if (isMockEnvironment) {
        // Use mock data for development/preview
        const mockActionTypeCounts = [
          { action_type: "login", count: 45 },
          { action_type: "logout", count: 38 },
          { action_type: "issue_item", count: 27 },
          { action_type: "receive_item", count: 22 },
          { action_type: "create_user", count: 5 },
          { action_type: "update_user", count: 8 },
        ]

        const mockEntityTypeCounts = [
          { entity_type: "user", count: 13 },
          { entity_type: "item", count: 49 },
          { entity_type: "transaction", count: 32 },
        ]

        const mockUserActivityCounts = [
          { user_id: "1", email: "admin@example.com", full_name: "Admin User", count: 65 },
          { user_id: "2", email: "manager@example.com", full_name: "Manager User", count: 42 },
        ]

        // Generate mock time series data
        const mockTimeSeriesData: TimeSeriesData[] = []
        for (let i = 0; i < 7; i++) {
          const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd")
          mockTimeSeriesData.push({
            date,
            count: Math.floor(Math.random() * 20) + 5,
          })
        }

        setActionTypeCounts(mockActionTypeCounts)
        setEntityTypeCounts(mockEntityTypeCounts)
        setUserActivityCounts(mockUserActivityCounts)
        setTimeSeriesData(mockTimeSeriesData)
        setLoading(false)
        return
      }

      // Fetch action type counts - using a different approach to avoid the group issue
      const { data: actionData, error: actionError } = await supabase
        .from("admin_activities")
        .select("action_type")
        .gte("created_at", startDateStr)
        .lte("created_at", endDateStr)

      if (actionError) {
        throw actionError
      }

      // Count action types manually
      const actionCounts: Record<string, number> = {}
      actionData.forEach((item) => {
        actionCounts[item.action_type] = (actionCounts[item.action_type] || 0) + 1
      })

      const formattedActionCounts = Object.entries(actionCounts)
        .map(([action_type, count]) => ({
          action_type,
          count,
        }))
        .sort((a, b) => b.count - a.count)

      setActionTypeCounts(formattedActionCounts)

      // Fetch entity type counts - using a similar approach
      const { data: entityData, error: entityError } = await supabase
        .from("admin_activities")
        .select("entity_type")
        .gte("created_at", startDateStr)
        .lte("created_at", endDateStr)
        .not("entity_type", "is", null)

      if (entityError) {
        throw entityError
      }

      // Count entity types manually
      const entityCounts: Record<string, number> = {}
      entityData.forEach((item) => {
        if (item.entity_type) {
          entityCounts[item.entity_type] = (entityCounts[item.entity_type] || 0) + 1
        }
      })

      const formattedEntityCounts = Object.entries(entityCounts)
        .map(([entity_type, count]) => ({
          entity_type,
          count,
        }))
        .sort((a, b) => b.count - a.count)

      setEntityTypeCounts(formattedEntityCounts)

      // Fetch user activity data
      const { data: userData, error: userError } = await supabase
        .from("admin_activities")
        .select(`
          user_id,
          users!user_id(
            email,
            full_name
          )
        `)
        .gte("created_at", startDateStr)
        .lte("created_at", endDateStr)

      if (userError) {
        throw userError
      }

      // Count user activities manually
      const userCounts: Record<string, { count: number; email: string; full_name: string | null }> = {}
      userData.forEach((item) => {
        if (item.user_id) {
          if (!userCounts[item.user_id]) {
            userCounts[item.user_id] = {
              count: 0,
              email: item.users?.email || "Unknown",
              full_name: item.users?.full_name || null,
            }
          }
          userCounts[item.user_id].count++
        }
      })

      const formattedUserCounts = Object.entries(userCounts)
        .map(([user_id, data]) => ({
          user_id,
          email: data.email,
          full_name: data.full_name,
          count: data.count,
        }))
        .sort((a, b) => b.count - a.count)

      setUserActivityCounts(formattedUserCounts)

      // Fetch time series data
      const { data: timeData, error: timeError } = await supabase
        .from("admin_activities")
        .select("created_at")
        .gte("created_at", startDateStr)
        .lte("created_at", endDateStr)

      if (timeError) {
        throw timeError
      }

      // Group by date
      const dateGroups: Record<string, number> = {}
      timeData.forEach((item) => {
        const date = format(new Date(item.created_at), "yyyy-MM-dd")
        dateGroups[date] = (dateGroups[date] || 0) + 1
      })

      // Convert to array and sort by date
      const timeSeriesArray = Object.entries(dateGroups)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      setTimeSeriesData(timeSeriesArray)
    } catch (error: any) {
      console.error("Error fetching report data:", error)
      setError(error.message || "Ma'lumotlarni yuklashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  // Format data for charts
  const formatActionTypeData = () => {
    return actionTypeCounts.map((item) => ({
      name: item.action_type,
      value: item.count,
    }))
  }

  const formatEntityTypeData = () => {
    return entityTypeCounts.map((item) => ({
      name: item.entity_type || "Noma'lum",
      value: item.count,
    }))
  }

  const formatUserActivityData = () => {
    return userActivityCounts.map((item) => ({
      name: item.full_name || item.email,
      value: item.count,
    }))
  }

  // Export data as CSV
  const exportToCSV = (data: any[], filename: string, columns: { key: string; label: string }[]) => {
    // Create CSV header
    let csv = columns.map((col) => col.label).join(",") + "\n"

    // Add each row
    data.forEach((item) => {
      const row = columns
        .map((col) => {
          const value = item[col.key] !== undefined ? String(item[col.key]) : ""
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

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Admin faoliyatlari hisoboti</CardTitle>
              <CardDescription>Tizimda adminlar tomonidan amalga oshirilgan harakatlar statistikasi</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Vaqt oralig'i" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">So'nggi 7 kun</SelectItem>
                  <SelectItem value="30days">So'nggi 30 kun</SelectItem>
                  <SelectItem value="month">Joriy oy</SelectItem>
                  <SelectItem value="week">Joriy hafta</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => fetchReportData()}>
                Yangilash
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Xatolik</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Umumiy ko'rinish</TabsTrigger>
                <TabsTrigger value="actions">Harakatlar</TabsTrigger>
                <TabsTrigger value="entities">Obyektlar</TabsTrigger>
                <TabsTrigger value="users">Foydalanuvchilar</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Time series chart */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">Vaqt bo'yicha faoliyatlar</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          exportToCSV(timeSeriesData, "vaqt_boyicha_faoliyatlar", [
                            { key: "date", label: "Sana" },
                            { key: "count", label: "Faoliyatlar soni" },
                          ])
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <Skeleton className="h-[300px] w-full" />
                      ) : timeSeriesData.length > 0 ? (
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={timeSeriesData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip
                                formatter={(value) => [`${value} ta`, "Faoliyatlar soni"]}
                                labelFormatter={(label) => `Sana: ${label}`}
                              />
                              <Bar dataKey="count" fill="#0088FE" name="Faoliyatlar soni" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                          Ma'lumotlar topilmadi
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Action types pie chart */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">Harakat turlari</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          exportToCSV(actionTypeCounts, "harakat_turlari", [
                            { key: "action_type", label: "Harakat turi" },
                            { key: "count", label: "Soni" },
                          ])
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <Skeleton className="h-[300px] w-full" />
                      ) : actionTypeCounts.length > 0 ? (
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={formatActionTypeData()}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              >
                                {formatActionTypeData().map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value} ta`, "Soni"]} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                          Ma'lumotlar topilmadi
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="actions">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Harakat turlari bo'yicha statistika</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        exportToCSV(actionTypeCounts, "harakat_turlari_statistikasi", [
                          { key: "action_type", label: "Harakat turi" },
                          { key: "count", label: "Soni" },
                        ])
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-[400px] w-full" />
                    ) : actionTypeCounts.length > 0 ? (
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={actionTypeCounts} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="action_type" type="category" width={150} />
                            <Tooltip formatter={(value) => [`${value} ta`, "Soni"]} />
                            <Bar dataKey="count" fill="#0088FE" name="Faoliyatlar soni" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                        Ma'lumotlar topilmadi
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="entities">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Obyekt turlari bo'yicha statistika</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        exportToCSV(entityTypeCounts, "obyekt_turlari_statistikasi", [
                          { key: "entity_type", label: "Obyekt turi" },
                          { key: "count", label: "Soni" },
                        ])
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-[400px] w-full" />
                    ) : entityTypeCounts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={entityTypeCounts} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis dataKey="entity_type" type="category" width={150} />
                              <Tooltip formatter={(value) => [`${value} ta`, "Soni"]} />
                              <Bar dataKey="count" fill="#00C49F" name="Faoliyatlar soni" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={formatEntityTypeData()}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              >
                                {formatEntityTypeData().map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value} ta`, "Soni"]} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                        Ma'lumotlar topilmadi
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Adminlar faolligi</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        exportToCSV(
                          userActivityCounts.map((item) => ({
                            email: item.email,
                            full_name: item.full_name || "",
                            count: item.count,
                          })),
                          "adminlar_faolligi",
                          [
                            { key: "email", label: "Email" },
                            { key: "full_name", label: "To'liq ism" },
                            { key: "count", label: "Faoliyatlar soni" },
                          ],
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-[400px] w-full" />
                    ) : userActivityCounts.length > 0 ? (
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={userActivityCounts} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis
                              dataKey="email"
                              type="category"
                              width={150}
                              tickFormatter={(value) => {
                                const user = userActivityCounts.find((u) => u.email === value)
                                return user?.full_name || value
                              }}
                            />
                            <Tooltip
                              formatter={(value) => [`${value} ta`, "Faoliyatlar soni"]}
                              labelFormatter={(label) => {
                                const user = userActivityCounts.find((u) => u.email === label)
                                return user?.full_name ? `${user.full_name} (${label})` : label
                              }}
                            />
                            <Bar dataKey="count" fill="#8884D8" name="Faoliyatlar soni" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                        Ma'lumotlar topilmadi
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
