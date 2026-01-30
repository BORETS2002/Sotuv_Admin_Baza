"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  FileCheck,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = getSupabaseClient()
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    fetchReports()
  }, [searchQuery, statusFilter, typeFilter])

  const fetchReports = async () => {
    try {
      setLoading(true)
      setError(null)
      // Build query for reports
      let query = supabase
        .from("reports")
        .select(`
          id,
          title,
          description,
          report_type,
          status,
          start_date,
          end_date,
          created_at,
          department:department_id(id, name),
          created_by(id, email),
          approved_by(id, email)
        `)
        .order("created_at", { ascending: false })

      // Apply filters
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }

      if (typeFilter !== "all") {
        query = query.eq("report_type", typeFilter)
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setReports(data || [])
    } catch (error: any) {
      console.error("Error fetching reports:", error)
      setError("Hisobotlarni yuklashda xatolik yuz berdi: " + error.message)
      toast({
        title: "Xatolik",
        description: error.message || "Ma'lumotlarni olishda xatolik",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Mavjud emas"
    try {
      return new Date(dateString).toLocaleDateString("uz-UZ", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (error) {
      console.error("Invalid date format:", dateString)
      return "Noto'g'ri sana"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge className="bg-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Qoralama</span>
          </Badge>
        )
      case "submitted":
        return (
          <Badge className="bg-blue-500 flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>Topshirilgan</span>
          </Badge>
        )
      case "approved":
        return (
          <Badge className="bg-green-500 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Tasdiqlangan</span>
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-500 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            <span>Rad etilgan</span>
          </Badge>
        )
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

  const getUserName = (user: any) => {
    if (!user) return "Noma'lum"
    return user.email?.split("@")[0] || "Noma'lum"
  }

  const handleNavigateToCreate = () => {
    try {
      // Use window.location for a full page navigation
      if (typeof window !== "undefined") {
        window.location.href = "/dashboard/reports/create"
      }
    } catch (error) {
      console.error("Error navigating to create:", error)
      toast({
        title: "Xatolik",
        description: "Hisobot yaratish sahifasiga o'tishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const handleNavigateToReport = (reportId: string) => {
    try {
      // Use window.location for a full page navigation
      if (typeof window !== "undefined") {
        window.location.href = `/dashboard/reports/${reportId}`
      }
    } catch (error) {
      console.error("Error navigating to report:", error)
      toast({
        title: "Xatolik",
        description: "Hisobot tafsilotlari sahifasiga o'tishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const isSuperAdmin = user?.role === "superadmin"

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hisobotlar</h1>
          <p className="text-muted-foreground">Ombor boshqaruv tizimi hisobotlari</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* "Inventar hisoboti" va "Analitika" tugmalari olib tashlandi */}
          <Button onClick={handleNavigateToCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Hisobot yaratish
          </Button>
        </div>
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
          <CardTitle>Hisobotlar ro'yxati</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Hisobot nomi yoki tavsifi bo'yicha qidirish..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Holati:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Barcha holatlar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha holatlar</SelectItem>
                    <SelectItem value="draft">Qoralama</SelectItem>
                    <SelectItem value="submitted">Topshirilgan</SelectItem>
                    <SelectItem value="approved">Tasdiqlangan</SelectItem>
                    <SelectItem value="rejected">Rad etilgan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Turi:</span>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Barcha turlar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha turlar</SelectItem>
                    <SelectItem value="daily">Kunlik</SelectItem>
                    <SelectItem value="weekly">Haftalik</SelectItem>
                    <SelectItem value="monthly">Oylik</SelectItem>
                    <SelectItem value="custom">Maxsus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomi</TableHead>
                  <TableHead>Turi</TableHead>
                  <TableHead>Davr</TableHead>
                  <TableHead>Bo&apos;lim</TableHead>
                  <TableHead>Holati</TableHead>
                  <TableHead>Yaratgan</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : reports.length > 0 ? (
                  reports.map((report) => (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleNavigateToReport(report.id)}
                    >
                      <TableCell className="font-medium">
                        {report.title}
                        {report.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-xs">{report.description}</div>
                        )}
                      </TableCell>
                      <TableCell>{getReportTypeBadge(report.report_type)}</TableCell>
                      <TableCell>
                        {formatDate(report.start_date)} - {formatDate(report.end_date)}
                      </TableCell>
                      <TableCell>{report.department?.name || "Barcha bo'limlar"}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell>{getUserName(report.created_by)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Amallar</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleNavigateToReport(report.id)
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Batafsil
                            </DropdownMenuItem>
                            {report.status === "draft" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.location.href = `/dashboard/reports/${report.id}/edit`
                                }}
                              >
                                <FileCheck className="mr-2 h-4 w-4" />
                                Tahrirlash
                              </DropdownMenuItem>
                            )}
                            {report.status === "approved" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.location.href = `/dashboard/reports/${report.id}/download`
                                }}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Yuklab olish
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Hisobotlar topilmadi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
