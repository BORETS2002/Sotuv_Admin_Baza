"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { ArrowLeft, Download, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Special routes that are not UUIDs
const SPECIAL_ROUTES = ["create", "inventory", "analytics"]

export default function ReportDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [report, setReport] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = getSupabaseClient()

  // Handle special routes
  useEffect(() => {
    // Check if the ID is a special route
    if (SPECIAL_ROUTES.includes(params.id)) {
      // Handle special routes directly
      handleSpecialRoute(params.id)
      return
    }

    fetchReport()
  }, [params.id])

  // Handle special routes
  const handleSpecialRoute = (route: string) => {
    try {
      // Use window.location for a full page navigation
      if (typeof window !== "undefined") {
        if (route === "inventory") {
          window.location.href = "/dashboard/reports/inventory"
        } else if (route === "analytics") {
          window.location.href = "/dashboard/reports/analytics"
        } else if (route === "create") {
          window.location.href = "/dashboard/reports/create"
        }
      }
    } catch (error) {
      console.error("Error handling special route:", error)
      // If there's an error, redirect to the reports list
      router.push("/dashboard/reports")
    }
  }

  // Helper function to validate UUID format
  const isValidUUID = (uuid: string) => {
    try {
      // Oddiyroq UUID regex - asosiy formatni tekshiradi
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      return uuidRegex.test(uuid)
    } catch (error) {
      return false
    }
  }

  const fetchReport = async () => {
    // Skip fetching if the ID is a special route
    if (SPECIAL_ROUTES.includes(params.id)) return

    try {
      setIsLoading(true)
      setError(null)

      // Validate UUID format before querying
      if (!isValidUUID(params.id)) {
        console.error("Invalid UUID format:", params.id)
        setError("Noto'g'ri hisobot identifikatori. UUID formati noto'g'ri.")
        setIsLoading(false)
        return
      }

      // Fetch report
      const { data: reportData, error: reportError } = await supabase
        .from("reports")
        .select(`
          *,
          department:department_id(*),
          created_by_user:created_by(*, employee:employee_id(*)),
          approved_by_user:approved_by(*, employee:employee_id(*))
        `)
        .eq("id", params.id)
        .single()

      if (reportError) {
        console.error("Supabase error:", reportError)
        setError(`Hisobot ma'lumotlarini olishda xatolik: ${reportError.message}`)
        setIsLoading(false)
        return
      }

      if (!reportData) {
        setError("Hisobot topilmadi")
        setIsLoading(false)
        return
      }

      setReport(reportData)

      // Fetch report details with transactions
      const { data: detailsData, error: detailsError } = await supabase
        .from("report_details")
        .select(`
          *,
          transaction:transaction_id(
            *,
            item:item_id(*),
            employee:employee_id(*),
            issued_by_user:issued_by(*, employee:employee_id(*)),
            received_by_user:received_by(*, employee:employee_id(*))
          )
        `)
        .eq("report_id", params.id)

      if (detailsError) {
        console.error("Supabase details error:", detailsError)
        // Continue even if details have an error
        console.warn(`Hisobot tafsilotlarini olishda xatolik: ${detailsError.message}`)
      }

      setTransactions((detailsData || []).map((detail) => detail.transaction).filter(Boolean) || [])
    } catch (error: any) {
      console.error("Error fetching report:", error)
      setError(error.message || "Hisobot ma'lumotlarini olishda xatolik yuz berdi")
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveReport = async () => {
    try {
      setIsApproving(true)
      setError(null)

      if (!user?.id) {
        throw new Error("Foydalanuvchi ma'lumotlari topilmadi")
      }

      const { error } = await supabase
        .from("reports")
        .update({
          status: "approved",
          approved_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (error) throw error

      toast({
        title: "Muvaffaqiyatli",
        description: "Hisobot tasdiqlandi",
      })

      fetchReport()
    } catch (error: any) {
      console.error("Error approving report:", error)
      setError(error.message || "Hisobotni tasdiqlashda xatolik yuz berdi")
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleRejectReport = async () => {
    try {
      setIsRejecting(true)
      setError(null)

      if (!user?.id) {
        throw new Error("Foydalanuvchi ma'lumotlari topilmadi")
      }

      const { error } = await supabase
        .from("reports")
        .update({
          status: "rejected",
          approved_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (error) throw error

      toast({
        title: "Muvaffaqiyatli",
        description: "Hisobot rad etildi",
      })

      fetchReport()
    } catch (error: any) {
      console.error("Error rejecting report:", error)
      setError(error.message || "Hisobotni rad etishda xatolik yuz berdi")
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsRejecting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Qoralama</Badge>
      case "submitted":
        return <Badge>Topshirilgan</Badge>
      case "approved":
        return <Badge variant="success">Tasdiqlangan</Badge>
      case "rejected":
        return <Badge variant="destructive">Rad etilgan</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getReportTypeBadge = (type: string) => {
    switch (type) {
      case "daily":
        return <Badge variant="outline">Kunlik</Badge>
      case "weekly":
        return <Badge variant="outline">Haftalik</Badge>
      case "monthly":
        return <Badge variant="outline">Oylik</Badge>
      case "custom":
        return <Badge variant="outline">Maxsus</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd.MM.yyyy")
    } catch (error) {
      console.error("Invalid date format:", dateString)
      return "Noto'g'ri sana"
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd.MM.yyyy HH:mm")
    } catch (error) {
      console.error("Invalid date format:", dateString)
      return "Noto'g'ri sana"
    }
  }

  // If we're on a special route, show a loading state
  if (SPECIAL_ROUTES.includes(params.id)) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
        <p>Sahifa yuklanmoqda...</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
        <p>Ma'lumotlar yuklanmoqda...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Hisobot tafsilotlari</h1>
          <Button variant="outline" onClick={() => router.push("/dashboard/reports")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Orqaga
          </Button>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Xatolik yuz berdi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <div className="text-center">
          <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/reports")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Hisobotlar ro&apos;yxatiga qaytish
          </Button>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Hisobot tafsilotlari</h1>
          <Button variant="outline" onClick={() => router.push("/dashboard/reports")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Orqaga
          </Button>
        </div>

        <div className="text-center py-10">
          <h2 className="text-2xl font-bold">Hisobot topilmadi</h2>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/reports")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Hisobotlar ro&apos;yxatiga qaytish
          </Button>
        </div>
      </div>
    )
  }

  const isSuperAdmin = user?.role === "superadmin"
  const canApprove = isSuperAdmin && report.status === "submitted"

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push("/dashboard/reports")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Orqaga
          </Button>
          <h1 className="text-3xl font-bold">{report.title}</h1>
          {getStatusBadge(report.status)}
          {getReportTypeBadge(report.report_type)}
        </div>

        <div className="flex space-x-2">
          {canApprove && (
            <>
              <Button variant="outline" onClick={handleRejectReport} disabled={isRejecting || isApproving}>
                <XCircle className="mr-2 h-4 w-4" />
                {isRejecting ? "Rad etilmoqda..." : "Rad etish"}
              </Button>
              <Button onClick={handleApproveReport} disabled={isRejecting || isApproving}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {isApproving ? "Tasdiqlanmoqda..." : "Tasdiqlash"}
              </Button>
            </>
          )}
          {report.status === "approved" && (
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Yuklab olish
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hisobot ma&apos;lumotlari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Bo&apos;lim</p>
                <p className="font-medium">{report.department?.name || "Barcha bo'limlar"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Davr</p>
                <p className="font-medium">
                  {formatDate(report.start_date)} - {formatDate(report.end_date)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">Tavsif</p>
              <p className="font-medium">{report.description || "Tavsif mavjud emas"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Yaratilgan sana</p>
                <p className="font-medium">{formatDateTime(report.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Yaratgan</p>
                <p className="font-medium">
                  {report.created_by_user?.employee
                    ? `${report.created_by_user.employee.last_name || ""} ${report.created_by_user.employee.first_name || ""}`
                    : report.created_by_user?.email || "Noma'lum"}
                </p>
              </div>
            </div>

            {report.status === "approved" && report.approved_by && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Tasdiqlangan sana</p>
                  <p className="font-medium">{formatDateTime(report.updated_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tasdiqlagan</p>
                  <p className="font-medium">
                    {report.approved_by_user?.employee
                      ? `${report.approved_by_user.employee.last_name || ""} ${report.approved_by_user.employee.first_name || ""}`
                      : report.approved_by_user?.email || "Noma'lum"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Operatsiyalar</CardTitle>
            <CardDescription>Hisobotga kiritilgan operatsiyalar ro&apos;yxati</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Operatsiyalar mavjud emas</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inventar</TableHead>
                      <TableHead>Xodim</TableHead>
                      <TableHead>Berilgan sana</TableHead>
                      <TableHead>Qaytarilgan sana</TableHead>
                      <TableHead>Holati</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {transaction.item?.name || "Noma'lum"} ({transaction.item?.serial_number || "Noma'lum"})
                        </TableCell>
                        <TableCell>
                          {transaction.employee?.last_name || ""} {transaction.employee?.first_name || ""}
                        </TableCell>
                        <TableCell>
                          {transaction.issued_at ? formatDateTime(transaction.issued_at) : "Noma'lum"}
                        </TableCell>
                        <TableCell>
                          {transaction.returned_at ? formatDateTime(transaction.returned_at) : "Qaytarilmagan"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.returned_at ? "outline" : "default"}>
                            {transaction.returned_at ? "Yakunlangan" : "Faol"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
