"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building2, Package, FileText, AlertTriangle, CheckCircle2 } from "lucide-react"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    departments: 0,
    employees: 0,
    items: 0,
    transactions: 0,
    availableItems: 0,
    inUseItems: 0,
    damagedItems: 0,
    underRepairItems: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Parallel ravishda barcha so'rovlarni yuborish
        const [departmentsResponse, employeesResponse, itemsResponse, transactionsResponse, itemsByStatusResponse] =
          await Promise.all([
            // Fetch department count
            supabase
              .from("departments")
              .select("*", { count: "exact", head: true }),
            // Fetch employees count
            supabase
              .from("employees")
              .select("*", { count: "exact", head: true }),
            // Fetch items count
            supabase
              .from("items")
              .select("*", { count: "exact", head: true }),
            // Fetch transactions count
            supabase
              .from("item_transactions")
              .select("*", { count: "exact", head: true }),
            // Fetch items by status
            supabase
              .from("items")
              .select("status"),
          ])

        // Process items by status
        const statusCounts = {
          available: 0,
          in_use: 0,
          damaged: 0,
          under_repair: 0,
        }

        itemsByStatusResponse.data?.forEach((item) => {
          if (statusCounts.hasOwnProperty(item.status)) {
            statusCounts[item.status as keyof typeof statusCounts]++
          }
        })

        setStats({
          departments: departmentsResponse.count || 0,
          employees: employeesResponse.count || 0,
          items: itemsResponse.count || 0,
          transactions: transactionsResponse.count || 0,
          availableItems: statusCounts.available || 0,
          inUseItems: statusCounts.in_use || 0,
          damagedItems: statusCounts.damaged || 0,
          underRepairItems: statusCounts.under_repair || 0,
        })
      } catch (error) {
        console.error("Error fetching dashboard stats:", error)
        // Xato bo'lsa ham loading ni to'xtatish
        setIsLoading(false)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [supabase])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Boshqaruv paneli</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bo&apos;limlar</CardTitle>
            <Building2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.departments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Xodimlar</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.employees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inventar</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.items}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Operatsiyalar</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.transactions}</div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mt-8">Inventar holati</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mavjud</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Foydalanishda</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inUseItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Shikastlangan</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.damagedItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ta&apos;mirda</CardTitle>
            <Package className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.underRepairItems}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
