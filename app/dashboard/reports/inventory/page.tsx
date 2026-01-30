"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { BarChart, LineChart, PieChart, Loader2 } from "lucide-react"
import { generateInventoryReport } from "@/lib/inventory-report"

// Lazy load chart components
const ChartLoading = () => (
  <div className="flex items-center justify-center h-[300px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

export default function InventoryReportPage() {
  const supabase = getSupabaseClient()
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<any>(null)
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().setMonth(new Date().getMonth() - 1)))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    fetchReportData()
  }, [startDate, endDate])

  const fetchReportData = async () => {
    if (!startDate || !endDate) return

    setLoading(true)
    try {
      const report = await generateInventoryReport(supabase, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })
      setReportData(report)
    } catch (error) {
      console.error("Error fetching inventory report:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventar hisoboti</h1>
          <p className="text-muted-foreground">Inventar holati va harakatlari bo&apos;yicha batafsil hisobot</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <DatePicker date={startDate} setDate={setStartDate} label="Boshlanish sanasi" />
          <DatePicker date={endDate} setDate={setEndDate} label="Tugash sanasi" />
          <Button onClick={fetchReportData} disabled={loading}>
            {loading ? "Yuklanmoqda..." : "Yangilash"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">
            <PieChart className="mr-2 h-4 w-4" />
            Umumiy ko&apos;rinish
          </TabsTrigger>
          <TabsTrigger value="movements">
            <LineChart className="mr-2 h-4 w-4" />
            Inventar harakatlari
          </TabsTrigger>
          <TabsTrigger value="departments">
            <BarChart className="mr-2 h-4 w-4" />
            Bo&apos;limlar bo&apos;yicha
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Jami inventar</CardTitle>
                <CardDescription>Barcha inventar buyumlari soni</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{loading ? "..." : reportData?.totalItems || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Faol inventar</CardTitle>
                <CardDescription>Hozirda foydalanilayotgan buyumlar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{loading ? "..." : reportData?.activeItems || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Ombordagi inventar</CardTitle>
                <CardDescription>Omborda saqlanayotgan buyumlar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{loading ? "..." : reportData?.warehouseItems || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Yangi qo&apos;shilgan</CardTitle>
                <CardDescription>Tanlangan davrda qo&apos;shilgan buyumlar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{loading ? "..." : reportData?.newItems || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Berilgan inventar</CardTitle>
                <CardDescription>Tanlangan davrda berilgan buyumlar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{loading ? "..." : reportData?.issuedItems || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Qaytarilgan inventar</CardTitle>
                <CardDescription>Tanlangan davrda qaytarilgan buyumlar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{loading ? "..." : reportData?.returnedItems || 0}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Inventar harakatlari</CardTitle>
              <CardDescription>Tanlangan davr uchun inventar harakatlari</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border">
                    <div className="grid grid-cols-4 gap-4 p-4 font-medium">
                      <div>Sana</div>
                      <div>Operatsiya</div>
                      <div>Buyum</div>
                      <div>Bo&apos;lim</div>
                    </div>
                    <div className="divide-y">
                      {reportData?.movements?.length > 0 ? (
                        reportData.movements.map((movement: any, index: number) => (
                          <div key={index} className="grid grid-cols-4 gap-4 p-4">
                            <div>{new Date(movement.date).toLocaleDateString()}</div>
                            <div>{movement.operation}</div>
                            <div>{movement.item}</div>
                            <div>{movement.department}</div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center">Ma&apos;lumot topilmadi</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle>Bo&apos;limlar bo&apos;yicha inventar</CardTitle>
              <CardDescription>Bo&apos;limlar bo&apos;yicha inventar taqsimoti</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border">
                    <div className="grid grid-cols-3 gap-4 p-4 font-medium">
                      <div>Bo&apos;lim</div>
                      <div>Inventar soni</div>
                      <div>Foiz</div>
                    </div>
                    <div className="divide-y">
                      {reportData?.departmentStats?.length > 0 ? (
                        reportData.departmentStats.map((stat: any, index: number) => (
                          <div key={index} className="grid grid-cols-3 gap-4 p-4">
                            <div>{stat.department}</div>
                            <div>{stat.count}</div>
                            <div>{stat.percentage}%</div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center">Ma&apos;lumot topilmadi</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
