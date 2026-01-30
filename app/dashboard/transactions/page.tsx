"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CalendarIcon, Download, RefreshCw, Search, Filter, ArrowUpDown } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { getUser } from "@/lib/session-manager"

type Transaction = {
  id: string
  item_id: string
  employee_id: string
  issued_by: string
  received_by: string | null
  issued_at: string
  returned_at: string | null
  status_before: string
  status_after: string
  notes: string | null
  created_at: string
  updated_at: string | null
  item?: {
    id: string
    name: string
    serial_number: string
  }
  employee?: {
    id: string
    first_name: string
    last_name: string
    department?: {
      id: string
      name: string
    }
  }
  issuer?: {
    id: string
    email: string
    employee?: {
      id: string
      first_name: string
      last_name: string
    } | null
  }
  receiver?: {
    id: string
    email: string
    employee?: {
      id: string
      first_name: string
      last_name: string
    } | null
  } | null
}

type Department = {
  id: string
  name: string
}

type ItemCategory = {
  id: string
  name: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [showReturned, setShowReturned] = useState(true)
  const [showActive, setShowActive] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" }>({
    key: "issued_at",
    direction: "descending",
  })

  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)

  // Fetch transactions data
  useEffect(() => {
    fetchTransactions()
  }, [])

  // Apply filters when filter state changes
  useEffect(() => {
    applyFilters()
  }, [
    transactions,
    searchQuery,
    dateRange,
    selectedDepartment,
    selectedCategory,
    selectedStatus,
    showReturned,
    showActive,
    sortConfig,
  ])

  const fetchTransactions = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()

      // 1. Fetch basic transaction data
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("item_transactions")
        .select("*")
        .order("issued_at", { ascending: false })

      if (transactionsError) {
        throw transactionsError
      }

      if (!transactionsData || transactionsData.length === 0) {
        setTransactions([])
        setFilteredTransactions([])
        setLoading(false)
        return
      }

      // 2. Extract unique IDs for related data
      const itemIds = [...new Set(transactionsData.map((t) => t.item_id).filter(Boolean))]
      const employeeIds = [...new Set(transactionsData.map((t) => t.employee_id).filter(Boolean))]
      const userIds = [
        ...new Set([
          ...transactionsData.map((t) => t.issued_by).filter(Boolean),
          ...transactionsData.map((t) => t.received_by).filter(Boolean),
        ]),
      ]

      // 3. Fetch items data with all columns
      const { data: itemsData, error: itemsError } = await supabase.from("items").select("*").in("id", itemIds)

      if (itemsError) {
        throw itemsError
      }

      // 4. Fetch departments data
      const { data: departmentsData, error: departmentsError } = await supabase.from("departments").select("id, name")

      if (departmentsError) {
        throw departmentsError
      }

      // 5. Fetch employees data
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("*")
        .in("id", employeeIds)

      if (employeesError) {
        throw employeesError
      }

      // 6. Fetch users data
      const { data: usersData, error: usersError } = await supabase.from("users").select("id, email").in("id", userIds)

      if (usersError) {
        throw usersError
      }

      // 7. Create maps for quick lookups
      const itemsMap = new Map(itemsData.map((item) => [item.id, item]))
      const employeesMap = new Map(employeesData.map((emp) => [emp.id, emp]))
      const departmentsMap = new Map(departmentsData.map((dept) => [dept.id, dept]))
      const usersMap = new Map(usersData.map((user) => [user.id, user]))

      // 8. Combine all data
      const combinedData = transactionsData.map((transaction) => {
        const item = itemsMap.get(transaction.item_id)
        const employee = employeesMap.get(transaction.employee_id)

        // Find department ID from employee (try different possible column names)
        const departmentId = employee ? employee.department_id || employee.dept_id || null : null

        // Add department to employee if exists
        const employeeWithDepartment = employee
          ? {
              ...employee,
              department: departmentId ? departmentsMap.get(departmentId) : undefined,
            }
          : undefined

        // Add issuer and receiver
        const issuer = transaction.issued_by ? usersMap.get(transaction.issued_by) : undefined
        const receiver = transaction.received_by ? usersMap.get(transaction.received_by) : undefined

        return {
          ...transaction,
          item: item,
          employee: employeeWithDepartment,
          issuer: issuer,
          receiver: receiver,
        }
      })

      setTransactions(combinedData as Transaction[])
      setFilteredTransactions(combinedData as Transaction[])

      // Store departments for filters
      setDepartments(departmentsData || [])
      setCategories([])
    } catch (error: any) {
      console.error("Error fetching transactions:", error)
      setError(error.message || "Ma'lumotlarni yuklashda xatolik yuz berdi")
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Operatsiyalar ma'lumotlarini yuklashda xatolik yuz berdi",
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...transactions]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (transaction) =>
          transaction.item?.name?.toLowerCase().includes(query) ||
          transaction.item?.serial_number?.toLowerCase().includes(query) ||
          `${transaction.employee?.first_name || ""} ${transaction.employee?.last_name || ""}`
            .toLowerCase()
            .includes(query) ||
          transaction.notes?.toLowerCase().includes(query),
      )
    }

    // Apply date range filter
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter((transaction) => {
        const transactionDate = new Date(transaction.issued_at)
        return transactionDate >= fromDate
      })
    }

    if (dateRange.to) {
      const toDate = new Date(dateRange.to)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter((transaction) => {
        const transactionDate = new Date(transaction.issued_at)
        return transactionDate <= toDate
      })
    }

    // Apply department filter
    if (selectedDepartment !== "all") {
      filtered = filtered.filter((transaction) => transaction.employee?.department?.id === selectedDepartment)
    }

    // Apply status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter((transaction) => transaction.status_after === selectedStatus)
    }

    // Apply returned/active filters
    if (!showReturned && !showActive) {
      // If both are unchecked, show nothing
      filtered = []
    } else if (!showReturned) {
      // Only show active (not returned)
      filtered = filtered.filter((transaction) => !transaction.returned_at)
    } else if (!showActive) {
      // Only show returned
      filtered = filtered.filter((transaction) => transaction.returned_at)
    }

    // Apply sorting
    filtered = sortData(filtered, sortConfig.key, sortConfig.direction)

    setFilteredTransactions(filtered)
  }

  const sortData = (data: Transaction[], key: string, direction: "ascending" | "descending") => {
    return [...data].sort((a, b) => {
      let aValue, bValue

      // Handle nested properties
      if (key === "item_name") {
        aValue = a.item?.name || ""
        bValue = b.item?.name || ""
      } else if (key === "employee_name") {
        aValue = `${a.employee?.last_name || ""} ${a.employee?.first_name || ""}` || ""
        bValue = `${b.employee?.last_name || ""} ${b.employee?.first_name || ""}` || ""
      } else if (key === "department") {
        aValue = a.employee?.department?.name || ""
        bValue = b.employee?.department?.name || ""
      } else if (key === "issued_at" || key === "returned_at") {
        aValue = a[key] ? new Date(a[key]).getTime() : 0
        bValue = b[key] ? new Date(b[key]).getTime() : 0
      } else {
        aValue = a[key as keyof Transaction] || ""
        bValue = b[key as keyof Transaction] || ""
      }

      // Compare values
      if (aValue < bValue) {
        return direction === "ascending" ? -1 : 1
      }
      if (aValue > bValue) {
        return direction === "ascending" ? 1 : -1
      }
      return 0
    })
  }

  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "ascending" ? "descending" : "ascending",
    }))
  }

  const resetFilters = () => {
    setSearchQuery("")
    setDateRange({ from: undefined, to: undefined })
    setSelectedDepartment("all")
    setSelectedStatus("all")
    setShowReturned(true)
    setShowActive(true)
    setSortConfig({
      key: "issued_at",
      direction: "descending",
    })
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredTransactions.slice(start, end)
  }, [filteredTransactions, currentPage, itemsPerPage])

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    try {
      return format(new Date(dateString), "dd.MM.yyyy HH:mm")
    } catch (e) {
      return dateString
    }
  }

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Mavjud</Badge>
      case "in_use":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Foydalanishda</Badge>
      case "damaged":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Shikastlangan</Badge>
      case "under_repair":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Ta'mirda</Badge>
      case "discarded":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Chiqitga chiqarilgan</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status}</Badge>
    }
  }

  // Get operation type badge
  const getOperationBadge = (transaction: Transaction) => {
    if (transaction.returned_at) {
      return (
        <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100">
          Qaytarilgan
        </Badge>
      )
    } else {
      return (
        <Badge variant="warning" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          Berilgan
        </Badge>
      )
    }
  }

  // Export transactions to CSV
  const exportToCSV = () => {
    // Create CSV header
    let csv = "ID,Sana,Mahsulot,Seriya raqami,Kategoriya,Xodim,Bo'lim,Operatsiya,Status,Izoh\n"

    // Add each transaction as a row
    filteredTransactions.forEach((transaction) => {
      const operationType = transaction.returned_at ? "Qaytarilgan" : "Berilgan"
      const row = [
        transaction.id,
        formatDate(transaction.issued_at),
        transaction.item?.name || "",
        transaction.item?.serial_number || "",
        transaction.item?.category?.name || "",
        `${transaction.employee?.last_name || ""} ${transaction.employee?.first_name || ""}`,
        transaction.employee?.department?.name || "",
        operationType,
        transaction.status_after,
        transaction.notes || "",
      ]
        .map((value) => `"${value.replace(/"/g, '""')}"`)
        .join(",")
      csv += row + "\n"
    })

    // Create and download the CSV file
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `operatsiyalar_${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Initial data fetch
  useEffect(() => {
    const userData = getUser()
    if (!userData) {
      router.push("/")
      return
    }
    setUser(userData)
  }, [router])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Operatsiyalar</h1>
          <p className="text-muted-foreground">Mahsulotlar berish va qaytarish operatsiyalari</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchTransactions} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Yangilash
          </Button>
          <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            CSV yuklab olish
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
          <CardTitle>Operatsiyalar ro'yxati</CardTitle>
          <CardDescription>
            Jami: {filteredTransactions.length} ta operatsiya
            {filteredTransactions.length !== transactions.length && ` (Filtrlangan: ${transactions.length} dan)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Qidirish..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd.MM.yyyy")} - {format(dateRange.to, "dd.MM.yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd.MM.yyyy")
                      )
                    ) : (
                      "Sana tanlash"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => setDateRange(range as { from: Date | undefined; to: Date | undefined })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtrlar
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Bo'lim</Label>
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger id="department">
                          <SelectValue placeholder="Bo'limni tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Barcha bo'limlar</SelectItem>
                          {departments.map((department) => (
                            <SelectItem key={department.id} value={department.id}>
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Kategoriyalar filtri o'chirildi */}

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Statusni tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Barcha statuslar</SelectItem>
                          <SelectItem value="available">Mavjud</SelectItem>
                          <SelectItem value="in_use">Foydalanishda</SelectItem>
                          <SelectItem value="damaged">Shikastlangan</SelectItem>
                          <SelectItem value="under_repair">Ta'mirda</SelectItem>
                          <SelectItem value="discarded">Chiqitga chiqarilgan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Operatsiya turi</Label>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="show-active"
                            checked={showActive}
                            onCheckedChange={(checked) => setShowActive(checked as boolean)}
                          />
                          <label
                            htmlFor="show-active"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Berilgan
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="show-returned"
                            checked={showReturned}
                            onCheckedChange={(checked) => setShowReturned(checked as boolean)}
                          />
                          <label
                            htmlFor="show-returned"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Qaytarilgan
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        Tozalash
                      </Button>
                      <Button size="sm" onClick={() => document.body.click()}>
                        Qo'llash
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left">
                      <div className="flex items-center cursor-pointer" onClick={() => handleSort("issued_at")}>
                        Sana
                        <ArrowUpDown
                          className={cn("ml-1 h-4 w-4", sortConfig.key === "issued_at" ? "opacity-100" : "opacity-40")}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <div className="flex items-center cursor-pointer" onClick={() => handleSort("item_name")}>
                        Mahsulot
                        <ArrowUpDown
                          className={cn("ml-1 h-4 w-4", sortConfig.key === "item_name" ? "opacity-100" : "opacity-40")}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <div className="flex items-center cursor-pointer" onClick={() => handleSort("employee_name")}>
                        Xodim
                        <ArrowUpDown
                          className={cn(
                            "ml-1 h-4 w-4",
                            sortConfig.key === "employee_name" ? "opacity-100" : "opacity-40",
                          )}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left">Operatsiya</th>
                    <th className="px-4 py-3 text-left">Status</th>
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
                            <Skeleton className="h-4 w-32" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-20" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-20" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-24" />
                          </td>
                        </tr>
                      ))
                  ) : paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => router.push(`/dashboard/transactions/${transaction.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div>{formatDate(transaction.issued_at)}</div>
                          {transaction.returned_at && (
                            <div className="text-xs text-muted-foreground">
                              Qaytarilgan: {formatDate(transaction.returned_at)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div>{transaction.item?.name || "Noma'lum"}</div>
                          <div className="text-xs text-muted-foreground">{transaction.item?.serial_number || ""}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            {transaction.employee?.last_name} {transaction.employee?.first_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {transaction.employee?.department?.name || ""}
                          </div>
                        </td>
                        <td className="px-4 py-3">{getOperationBadge(transaction)}</td>
                        <td className="px-4 py-3">{getStatusBadge(transaction.status_after)}</td>
                        <td className="px-4 py-3 max-w-xs truncate" title={transaction.notes || ""}>
                          {transaction.notes || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-center text-muted-foreground">
                        Operatsiyalar topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {filteredTransactions.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} dan {filteredTransactions.length}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                  Boshi
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Oldingi
                </Button>
                <span className="text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Keyingi
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Oxiri
                </Button>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              Oxirgi yangilanish: {format(new Date(), "dd.MM.yyyy HH:mm")}
            </p>
            <Button variant="outline" size="sm" onClick={fetchTransactions}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Yangilash
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
