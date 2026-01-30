"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { useToast } from "@/hooks/use-toast"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
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

export default function AnalyticsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [departments, setDepartments] = useState<any[]>([])
  const [startDate, setStartDate] = useState<Date>(startOfMonth(subMonths(new Date(), 1)))
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()))
  const [departmentId, setDepartmentId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const [transactionStats, setTransactionStats] = useState<any[]>([])
  const [itemStatusStats, setItemStatusStats] = useState<any[]>([])
  const [topEmployees, setTopEmployees] = useState<any[]>([])

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchDepartments()
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchAnalyticsData()
    }
  }, [startDate, endDate, departmentId])

  const fetchDepartments = async () => {
    try {
      setError(null)
      const { data, error } = await supabase.from("departments").select("*").order("name")
      if (error) throw error
      setDepartments(data || [])
    } catch (error: any) {
      console.error("Error fetching departments:", error)
      setError("Bo'limlarni yuklashda xatolik yuz berdi: " + error.message)
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const formattedStartDate = format(startDate, "yyyy-MM-dd")
      const formattedEndDate = format(endDate, "yyyy-MM-dd") + "T23:59:59"

      // Fetch transaction stats
      let transactionQuery = supabase
        .from("item_transactions")
        .select(`
          id,
          issued_at,
          returned_at,
          item:item_id(id, department_id)
        `)
        .gte("issued_at", formattedStartDate)
        .lte("issued_at", formattedEndDate)

      if (departmentId && departmentId !== "all") {
        transactionQuery = transactionQuery.eq("item.department_id", departmentId)
      }

      const { data: transactionData, error: transactionError } = await transactionQuery

      if (transactionError) throw transactionError

      // Process transaction data
      const transactionsByMonth: Record<string, { issued: number; returned: number }> = {}

      transactionData?.forEach((transaction) => {
        if (!transaction.issued_at) return

        const month = format(new Date(transaction.issued_at), "yyyy-MM")

        if (!transactionsByMonth[month]) {
          transactionsByMonth[month] = { issued: 0, returned: 0 }
        }

        transactionsByMonth[month].issued++

        if (transaction.returned_at) {
          const returnMonth = format(new Date(transaction.returned_at), "yyyy-MM")

          if (!transactionsByMonth[returnMonth]) {
            transactionsByMonth[returnMonth] = { issued: 0, returned: 0 }
          }

          transactionsByMonth[returnMonth].returned++
        }
      })

      const transactionStats = Object.entries(transactionsByMonth).map(([month, stats]) => ({
        month: format(new Date(month), "MMM yyyy"),
        berilgan: stats.issued,
        qaytarilgan: stats.returned,
      }))

      setTransactionStats(transactionStats.sort((a, b) => a.month.localeCompare(b.month)))

      // Fetch item status stats
      let itemQuery = supabase.from("items").select("status")

      if (departmentId && departmentId !== "all") {
        itemQuery = itemQuery.eq("department_id", departmentId)
      }

      const { data: itemData, error: itemError } = await itemQuery

      if (itemError) throw itemError

      // Process item status data
      const statusCounts: Record<string, number> = {
        available: 0,
        in_use: 0,
        damaged: 0,
        under_repair: 0,
        discarded: 0,
      }

      itemData?.forEach((item) => {
        if (statusCounts.hasOwnProperty(item.status)) {
          statusCounts[item.status]++
        }
      })

      const statusLabels: Record<string, string> = {
        available: "Mavjud",
        in_use: "Foydalanishda",
        damaged: "Shikastlangan",
        under_repair: "Ta'mirda",
        discarded: "Chiqitga chiqarilgan",
      }

      const itemStatusStats = Object.entries(statusCounts).map(([status, count]) => ({
        name: statusLabels[status] || status,
        value: count,
      }))

      setItemStatusStats(itemStatusStats)

      // Fetch top employees
      let employeeQuery = supabase
        .from("item_transactions")
        .select(`
          employee:employee_id(id, first_name, last_name, department_id)
        `)
        .gte("issued_at", formattedStartDate)
        .lte("issued_at", formattedEndDate)
        .not("employee", "is", null)

      if (departmentId && departmentId !== "all") {
        employeeQuery = employeeQuery.eq("item.department_id", departmentId)
      }

      const { data: employeeData, error: employeeError } = await employeeQuery

      if (employeeError) throw employeeError

      // Process employee data
      const employeeCounts: Record<string, { count: number; name: string }> = {}

      employeeData?.forEach((transaction) => {
        if (transaction.employee) {
          const employeeId = transaction.employee.id
          const employeeName = `${transaction.employee.last_name || ""} ${transaction.employee.first_name || ""}`

          if (!employeeCounts[employeeId]) {
            employeeCounts[employeeId] = { count: 0, name: employeeName }
          }

          employeeCounts[employeeId].count++
        }
      })

      const topEmployees = Object.values(employeeCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((employee) => ({
          name: employee.name,
          operatsiyalar: employee.count,
        }))

      setTopEmployees(topEmployees)
    } catch (error: any) {
      console.error("Error fetching analytics data:", error)
      setError("Analitika ma'lumotlarini yuklashda xatolik yuz berdi: " + error.message)
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analitika</h1>
        <Button variant="outline" onClick={() => router.push("/dashboard/reports")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Orqaga
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Xatolik</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filtrlar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Bo&apos;lim</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Bo'limni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha bo&apos;limlar</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Boshlanish sanasi</Label>
              <DatePicker date={startDate} setDate={(date) => date && setStartDate(date)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Tugash sanasi</Label>
              <DatePicker date={endDate} setDate={(date) => date && setEndDate(date)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Operatsiyalar statistikasi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {transactionStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={transactionStats}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="berilgan" fill="#0088FE" name="Berilgan" />
                      <Bar dataKey="qaytarilgan" fill="#00C49F" name="Qaytarilgan" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Ma'lumotlar mavjud emas</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventar holati</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {itemStatusStats.length > 0 && itemStatusStats.some((item) => item.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={itemStatusStats}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {itemStatusStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} ta`, "Soni"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Ma'lumotlar mavjud emas</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Eng faol xodimlar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {topEmployees.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topEmployees}
                      layout="vertical"
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="operatsiyalar" fill="#8884D8" name="Operatsiyalar soni" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Ma'lumotlar mavjud emas</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
