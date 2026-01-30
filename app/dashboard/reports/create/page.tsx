"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Maksimal qayta urinishlar soni
const MAX_RETRIES = 3
// Qayta urinishlar orasidagi vaqt (ms)
const RETRY_DELAY = 1000

export default function CreateReportPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shouldFetchTransactions, setShouldFetchTransactions] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const [reportData, setReportData] = useState({
    title: "",
    description: "",
    report_type: "daily",
    department_id: "",
    start_date: new Date(),
    end_date: new Date(),
  })

  // Supabase klientini olish
  const supabase = getSupabaseClient()

  // Qayta urinish bilan funksiyani bajarish uchun utilita
  const withRetry = async (fn: () => Promise<any>, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) => {
    let lastError
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        console.warn(`Attempt ${i + 1} failed, retrying in ${delay}ms...`, error)
        // So'nggi urinish bo'lmasa, kutib turamiz
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }
    throw lastError
  }

  // Bo'limlarni yuklash funksiyasi
  const fetchDepartments = async () => {
    try {
      setError(null)
      setIsLoadingDepartments(true)

      // Supabase klientini tekshirish
      if (!supabase || typeof supabase.from !== "function") {
        throw new Error("Supabase klienti to'g'ri ishga tushmadi")
      }

      // Qayta urinish bilan so'rovni bajarish
      const { data, error } = await withRetry(async () => {
        return await supabase.from("departments").select("*").order("name")
      })

      if (error) throw error

      setDepartments(data || [])
      setRetryCount(0) // Muvaffaqiyatli bo'lsa, qayta urinishlar sonini nolga qaytaramiz
    } catch (error: any) {
      console.error("Error fetching departments:", error)

      // Xatolik xabarini aniqlashtirish
      let errorMessage = "Bo'limlarni yuklashda xatolik yuz berdi"

      if (error.message) {
        errorMessage += ": " + error.message
      }

      if (error.message?.includes("Failed to fetch") || error.code === "NETWORK_ERROR") {
        errorMessage = "Internet aloqasi muammosi. Iltimos, internetga ulanganligingizni tekshiring."
      }

      setError(errorMessage)

      toast({
        title: "Xatolik yuz berdi",
        description: errorMessage,
        variant: "destructive",
      })

      // Qayta urinishlar sonini oshiramiz
      setRetryCount((prev) => prev + 1)

      // Agar maksimal qayta urinishlar soniga yetmagan bo'lsa, yana urinib ko'ramiz
      if (retryCount < MAX_RETRIES) {
        const timeout = setTimeout(() => {
          fetchDepartments()
        }, RETRY_DELAY)

        return () => clearTimeout(timeout)
      }
    } finally {
      setIsLoadingDepartments(false)
    }
  }

  // Operatsiyalarni yuklash funksiyasi
  const fetchTransactions = useCallback(async () => {
    if (!reportData.start_date || !reportData.end_date || !reportData.department_id) {
      return
    }

    try {
      setError(null)
      setIsLoadingTransactions(true)
      const startDate = format(reportData.start_date, "yyyy-MM-dd")
      const endDate = format(reportData.end_date, "yyyy-MM-dd") + "T23:59:59"

      // Supabase klientini tekshirish
      if (!supabase || typeof supabase.from !== "function") {
        throw new Error("Supabase klienti to'g'ri ishga tushmadi")
      }

      // Qayta urinish bilan so'rovni bajarish
      const { data, error } = await withRetry(async () => {
        let query = supabase
          .from("item_transactions")
          .select(`
            id,
            issued_at,
            returned_at,
            status_before,
            status_after,
            notes,
            item:item_id(id, name, serial_number, department_id),
            employee:employee_id(id, first_name, last_name, department_id)
          `)
          .gte("issued_at", startDate)
          .lte("issued_at", endDate)

        if (reportData.department_id && reportData.department_id !== "all") {
          query = query.eq("item.department_id", reportData.department_id)
        }

        return await query
      })

      if (error) throw error

      // Ma'lumotlarni tekshirish
      const validData = data?.filter((item) => item.item && item.item.name) || []
      setTransactions(validData)

      // Tanlangan operatsiyalarni tozalash
      setSelectedTransactions([])
    } catch (error: any) {
      console.error("Error fetching transactions:", error)

      // Xatolik xabarini aniqlashtirish
      let errorMessage = "Operatsiyalarni yuklashda xatolik yuz berdi"

      if (error.message) {
        errorMessage += ": " + error.message
      }

      if (error.message?.includes("Failed to fetch") || error.code === "NETWORK_ERROR") {
        errorMessage = "Internet aloqasi muammosi. Iltimos, internetga ulanganligingizni tekshiring."
      }

      setError(errorMessage)

      toast({
        title: "Xatolik yuz berdi",
        description: errorMessage,
        variant: "destructive",
      })

      setTransactions([])
    } finally {
      setIsLoadingTransactions(false)
      setShouldFetchTransactions(false)
    }
  }, [reportData.start_date, reportData.end_date, reportData.department_id, supabase, toast])

  // Bo'limlarni yuklash
  useEffect(() => {
    fetchDepartments()
  }, [])

  // Operatsiyalarni yuklash
  useEffect(() => {
    if (shouldFetchTransactions) {
      fetchTransactions()
    }
  }, [shouldFetchTransactions, fetchTransactions])

  // Kerakli ma'lumotlar o'zgarganda, operatsiyalarni yuklashni belgilash
  useEffect(() => {
    if (reportData.start_date && reportData.end_date && reportData.department_id) {
      setShouldFetchTransactions(true)
    }
  }, [reportData.start_date, reportData.end_date, reportData.department_id])

  // Hisobot yaratish
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!reportData.title.trim()) {
        toast({
          title: "Xatolik",
          description: "Hisobot sarlavhasini kiriting",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (selectedTransactions.length === 0) {
        toast({
          title: "Xatolik",
          description: "Kamida bitta operatsiyani tanlang",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (!user?.id) {
        toast({
          title: "Xatolik",
          description: "Foydalanuvchi ma'lumotlari topilmadi",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Supabase klientini tekshirish
      if (!supabase || typeof supabase.from !== "function") {
        throw new Error("Supabase klienti to'g'ri ishga tushmadi")
      }

      // Hisobot yaratish
      const { data: reportDataResult, error: reportError } = await withRetry(async () => {
        return await supabase
          .from("reports")
          .insert([
            {
              title: reportData.title,
              description: reportData.description,
              report_type: reportData.report_type,
              department_id: reportData.department_id !== "all" ? reportData.department_id : null,
              created_by: user.id,
              start_date: format(reportData.start_date, "yyyy-MM-dd"),
              end_date: format(reportData.end_date, "yyyy-MM-dd"),
              status: "submitted",
            },
          ])
          .select()
      })

      if (reportError) throw reportError

      if (!reportDataResult || reportDataResult.length === 0) {
        throw new Error("Hisobot yaratilmadi")
      }

      const reportId = reportDataResult[0].id

      // Hisobot tafsilotlarini qo'shish
      const reportDetails = selectedTransactions.map((transactionId) => ({
        report_id: reportId,
        transaction_id: transactionId,
      }))

      const { error: detailsError } = await withRetry(async () => {
        return await supabase.from("report_details").insert(reportDetails)
      })

      if (detailsError) throw detailsError

      toast({
        title: "Muvaffaqiyatli",
        description: "Hisobot yaratildi",
      })

      router.push("/dashboard/reports")
    } catch (error: any) {
      console.error("Error creating report:", error)

      // Xatolik xabarini aniqlashtirish
      let errorMessage = "Hisobot yaratishda xatolik yuz berdi"

      if (error.message) {
        errorMessage += ": " + error.message
      }

      if (error.message?.includes("Failed to fetch") || error.code === "NETWORK_ERROR") {
        errorMessage = "Internet aloqasi muammosi. Iltimos, internetga ulanganligingizni tekshiring."
      }

      setError(errorMessage)

      toast({
        title: "Xatolik yuz berdi",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Operatsiyani tanlash/bekor qilish
  const toggleTransaction = (id: string) => {
    if (selectedTransactions.includes(id)) {
      setSelectedTransactions(selectedTransactions.filter((transId) => transId !== id))
    } else {
      setSelectedTransactions([...selectedTransactions, id])
    }
  }

  // Sanani formatlash
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd.MM.yyyy HH:mm")
    } catch (error) {
      console.error("Invalid date format:", dateString)
      return "Noto'g'ri sana"
    }
  }

  // Orqaga qaytish
  const handleNavigateBack = () => {
    try {
      router.push("/dashboard/reports")
    } catch (error) {
      // Router ishlamasa, to'g'ridan-to'g'ri navigatsiya
      window.location.href = "/dashboard/reports"
    }
  }

  // Bo'lim o'zgarishi
  const handleDepartmentChange = (value: string) => {
    setReportData({ ...reportData, department_id: value })
  }

  // Sana o'zgarishi
  const handleDateChange = (date: Date | undefined, field: "start_date" | "end_date") => {
    if (date) {
      setReportData({ ...reportData, [field]: date })
    }
  }

  // Qayta urinish tugmasi
  const handleRetry = () => {
    setRetryCount(0)
    setError(null)
    fetchDepartments()
    if (reportData.start_date && reportData.end_date && reportData.department_id) {
      setShouldFetchTransactions(true)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Hisobot yaratish</h1>
        <Button variant="outline" onClick={handleNavigateBack}>
          Orqaga
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Xatolik</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={handleRetry} className="self-start mt-2">
              Qayta urinib ko'rish
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Hisobot ma&apos;lumotlari</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Sarlavha</Label>
                <Input
                  id="title"
                  value={reportData.title}
                  onChange={(e) => setReportData({ ...reportData, title: e.target.value })}
                  placeholder="Hisobot sarlavhasi"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Tavsif</Label>
                <Textarea
                  id="description"
                  value={reportData.description}
                  onChange={(e) => setReportData({ ...reportData, description: e.target.value })}
                  placeholder="Hisobot tavsifi"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="report_type">Hisobot turi</Label>
                <Select
                  value={reportData.report_type}
                  onValueChange={(value) => setReportData({ ...reportData, report_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Hisobot turini tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Kunlik</SelectItem>
                    <SelectItem value="weekly">Haftalik</SelectItem>
                    <SelectItem value="monthly">Oylik</SelectItem>
                    <SelectItem value="custom">Maxsus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Bo&apos;lim</Label>
                {isLoadingDepartments ? (
                  <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md"></div>
                ) : (
                  <Select value={reportData.department_id} onValueChange={handleDepartmentChange}>
                    <SelectTrigger id="department">
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
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Boshlanish sanasi</Label>
                  <DatePicker date={reportData.start_date} setDate={(date) => handleDateChange(date, "start_date")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Tugash sanasi</Label>
                  <DatePicker date={reportData.end_date} setDate={(date) => handleDateChange(date, "end_date")} />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || selectedTransactions.length === 0}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Yaratilmoqda...
                  </span>
                ) : (
                  "Hisobot yaratish"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operatsiyalarni tanlash</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">
                    {reportData.department_id
                      ? "Tanlangan davr va bo'lim uchun operatsiyalar topilmadi"
                      : "Iltimos, avval bo'limni tanlang"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium">Jami: {transactions.length} ta operatsiya</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedTransactions.length === transactions.length) {
                          setSelectedTransactions([])
                        } else {
                          setSelectedTransactions(transactions.map((t) => t.id))
                        }
                      }}
                    >
                      {selectedTransactions.length === transactions.length
                        ? "Hammasini bekor qilish"
                        : "Hammasini tanlash"}
                    </Button>
                  </div>

                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTransactions.includes(transaction.id)
                          ? "border-primary bg-primary/10"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => toggleTransaction(transaction.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={selectedTransactions.includes(transaction.id)}
                            onCheckedChange={() => toggleTransaction(transaction.id)}
                            className="mt-1"
                          />
                          <div>
                            <h3 className="font-medium">
                              {transaction.item?.name || "Noma'lum"} ({transaction.item?.serial_number || "Noma'lum"})
                            </h3>
                            <p className="text-sm text-gray-500">
                              {transaction.employee?.last_name || ""} {transaction.employee?.first_name || ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">Berilgan: {formatDate(transaction.issued_at)}</p>
                          {transaction.returned_at && (
                            <p className="text-sm">Qaytarilgan: {formatDate(transaction.returned_at)}</p>
                          )}
                        </div>
                      </div>
                      {transaction.notes && (
                        <p className="mt-2 text-sm text-gray-600 border-t pt-2">{transaction.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 text-right">
                <p className="text-sm font-medium">
                  Tanlangan operatsiyalar: {selectedTransactions.length} / {transactions.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
