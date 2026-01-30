"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Search, Package, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { logItemIssue } from "@/lib/admin-logger"
import { Skeleton } from "@/components/ui/skeleton"

export default function IssueOrderPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [availableItems, setAvailableItems] = useState<any[]>([])
  const [filteredItems, setFilteredItems] = useState<any[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [notes, setNotes] = useState("")
  const supabase = getSupabaseClient()

  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("")

  // Xodimlarni yuklash
  useEffect(() => {
    fetchEmployees()
  }, [])

  // Xodim tanlanganda bo'limni yuklash
  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeDepartment()
    } else {
      setSelectedDepartment("")
      setAvailableItems([])
      setFilteredItems([])
    }
  }, [selectedEmployee])

  // Bo'lim tanlanganda buyumlarni yuklash
  useEffect(() => {
    if (selectedDepartment) {
      fetchAvailableItems()
    } else {
      setAvailableItems([])
      setFilteredItems([])
    }
  }, [selectedDepartment])

  // Qidiruv o'zgarganda filtrlash
  useEffect(() => {
    filterItems()
  }, [searchQuery, availableItems])

  const fetchEmployees = async () => {
    try {
      setIsDataLoading(true)
      // Bog'lanishsiz employees so'rovi
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("*")
        .order("last_name")

      if (employeesError) {
        console.error("[v0] Employees fetch error:", employeesError)
        throw new Error(`Xodimlarni olishda xatolik: ${employeesError.message}`)
      }

      // Departments so'rovini alohida qil
      const { data: departmentsData, error: departmentsError } = await supabase
        .from("departments")
        .select("*")

      if (departmentsError) {
        console.error("[v0] Departments fetch error:", departmentsError)
        // Departments olmasa, employees ni yoki'rincha ko'rsatamiz
      }

      // Departments mapini yaratish
      const departmentsMap = new Map(
        departmentsData?.map((d: any) => [d.id, d]) || []
      )

      // Employees ma'lumotlarini enrichment qilish
      const enrichedEmployees = employeesData?.map((emp: any) => ({
        ...emp,
        departments: departmentsMap.get(emp.department_id) || null
      })) || []

      setEmployees(enrichedEmployees)
    } catch (error: any) {
      console.error("[v0] Employees fetch error:", error.message)
      toast({
        title: "Xatolik yuz berdi",
        description: error.message || "Xodimlarni olishda xatolik",
        variant: "destructive",
      })
    } finally {
      setIsDataLoading(false)
    }
  }

  const fetchEmployeeDepartment = async () => {
    try {
      setIsDataLoading(true)
      console.log("[v0] Fetching department for employee ID:", selectedEmployee)

      // Bog'lanishsiz employees so'rovi
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", selectedEmployee)
        .single()

      if (error) {
        console.error("Employee department fetch error:", error)
        throw error
      }

      console.log("Employee department data:", data)
      setSelectedDepartment(data.department_id || "")
    } catch (error: any) {
      console.error("Employee department fetch error:", error)
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsDataLoading(false)
    }
  }

  const fetchAvailableItems = async () => {
    try {
      setIsDataLoading(true)
      console.log("Fetching items for department ID:", selectedDepartment)

      // Simplify the query to avoid relationship issues
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("status", "available")
        .eq("department_id", selectedDepartment)
        .order("name")

      if (error) {
        console.error("Items fetch error:", error)
        throw error
      }

      console.log("Available items data:", data)

      // Fetch categories separately if needed
      if (data && data.length > 0) {
        const categoryIds = [...new Set(data.map((item) => item.category_id).filter(Boolean))]

        if (categoryIds.length > 0) {
          const { data: categoriesData, error: categoriesError } = await supabase
            .from("categories")
            .select("*")
            .in("id", categoryIds)

          if (categoriesError) {
            console.error("Categories fetch error:", categoriesError)
          } else {
            // Add category information to items
            const itemsWithCategories = data.map((item) => ({
              ...item,
              categories: categoriesData.find((cat) => cat.id === item.category_id) || null,
            }))

            setAvailableItems(itemsWithCategories)
            setFilteredItems(itemsWithCategories)
            return
          }
        }
      }

      setAvailableItems(data || [])
      setFilteredItems(data || [])
    } catch (error: any) {
      console.error("Items fetch error:", error)
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsDataLoading(false)
    }
  }

  const filterItems = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(availableItems)
      return
    }

    const searchLower = searchQuery.toLowerCase()
    const filtered = availableItems.filter(
      (item) =>
        item.name.toLowerCase().includes(searchLower) ||
        item.serial_number.toLowerCase().includes(searchLower) ||
        (item.categories && item.categories.name && item.categories.name.toLowerCase().includes(searchLower)),
    )
    setFilteredItems(filtered)
  }, [searchQuery, availableItems])

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId)
      } else {
        return [...prev, itemId]
      }
    })
  }

  const handleIssueItems = async () => {
    if (!selectedEmployee) {
      toast({
        title: "Xatolik",
        description: "Xodimni tanlang",
        variant: "destructive",
      })
      return
    }

    if (selectedItems.length === 0) {
      toast({
        title: "Xatolik",
        description: "Kamida bitta buyumni tanlang",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)

      // Get employee details for logging
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("first_name, last_name")
        .eq("id", selectedEmployee)
        .single()

      if (employeeError) throw employeeError

      const employeeName = `${employeeData.first_name} ${employeeData.last_name}`

      // Get all selected items in one query
      const { data: selectedItemsData, error: itemsError } = await supabase
        .from("items")
        .select("id, name")
        .in("id", selectedItems)

      if (itemsError) throw itemsError

      // Prepare batch transactions
      const transactions = selectedItems.map((itemId) => ({
        item_id: itemId,
        employee_id: selectedEmployee,
        issued_by: user?.id,
        issued_at: new Date().toISOString(),
        status_before: "available",
        status_after: "in_use",
        notes: notes,
      }))

      // Insert all transactions in one batch
      const { error: transactionError } = await supabase.from("item_transactions").insert(transactions)

      if (transactionError) throw transactionError

      // Update all items status in one batch
      const { error: updateError } = await supabase
        .from("items")
        .update({
          status: "in_use",
          updated_at: new Date().toISOString(),
        })
        .in("id", selectedItems)

      if (updateError) throw updateError

      // Log activities in parallel
      if (user?.id) {
        const logPromises = selectedItemsData.map((item) =>
          logItemIssue(user.id, item.id, selectedEmployee, item.name, employeeName),
        )

        // Wait for all logging to complete
        await Promise.all(logPromises)
      }

      toast({
        title: "Muvaffaqiyatli",
        description: `${selectedItems.length} ta buyum xodimga berildi`,
      })

      // Reset form
      setSelectedEmployee("")
      setSelectedDepartment("")
      setSelectedItems([])
      setNotes("")

      // Redirect to transactions page
      router.push("/dashboard/transactions")
    } catch (error: any) {
      console.error("Issue items error:", error)
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Buyurtma berish</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Buyurtma ma&apos;lumotlari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Xodim</Label>
              {isDataLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Xodimni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.last_name} {employee.first_name} ({employee.position})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedDepartment && (
              <div className="space-y-2">
                <Label htmlFor="notes">Izoh</Label>
                <Textarea
                  id="notes"
                  placeholder="Buyurtma haqida qo'shimcha ma'lumot"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}

            <div className="pt-4">
              <Button
                onClick={handleIssueItems}
                disabled={isLoading || selectedItems.length === 0 || !selectedEmployee}
                className="w-full"
              >
                {isLoading ? (
                  "Jarayonda..."
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Buyumlarni berish ({selectedItems.length})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mavjud buyumlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDataLoading && selectedDepartment ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : selectedDepartment ? (
              <>
                <div className="flex items-center space-x-2">
                  <Search className="h-5 w-5 text-gray-500" />
                  <Input
                    placeholder="Qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2">
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">
                        {searchQuery ? "Qidiruv bo'yicha buyumlar topilmadi" : "Mavjud buyumlar yo'q"}
                      </p>
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedItems.includes(item.id) ? "border-primary bg-primary/10" : "hover:bg-gray-50"
                        }`}
                        onClick={() => toggleItemSelection(item.id)}
                      >
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-500">
                            {item.categories?.name || "Kategoriya yo'q"} | {item.serial_number}
                          </div>
                        </div>
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-10 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Xodimni tanlang</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
