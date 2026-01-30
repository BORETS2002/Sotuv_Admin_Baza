"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Loader2, ArrowLeft, Plus, Package } from "lucide-react"
import { getUser } from "@/lib/session-manager"
import { logItemReceive } from "@/lib/admin-logger"

// Types
type Employee = {
  id: string
  first_name: string
  last_name: string
  department_id: string
  department?: {
    name: string
  }
}

type Item = {
  id: string
  name: string
  status: string
  transaction_id?: string
}

export default function ReceiveOrderPage() {
  const router = useRouter()
  const supabase = getSupabaseClient()
  const [user, setUser] = useState<any>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [issuedItems, setIssuedItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      setIsDataLoading(true)
      const { data, error } = await supabase
        .from("employees")
        .select(`
          *,
          departments(*)
        `)
        .order("first_name")

      if (error) throw error
      setEmployees(data || [])
    } catch (error: any) {
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsDataLoading(false)
    }
  }, [supabase])

  // Fetch issued items for employee using item_transactions
  const fetchIssuedItems = useCallback(async () => {
    if (!selectedEmployee) return

    try {
      setIsDataLoading(true)

      // Get items assigned to this employee from item_transactions
      const { data, error } = await supabase
        .from("item_transactions")
        .select(`
          id,
          item_id,
          issued_at,
          returned_at,
          items(id, name, status)
        `)
        .eq("employee_id", selectedEmployee)
        .is("returned_at", null)
        .order("issued_at", { ascending: false })

      if (error) throw error

      // Transform the data
      const transformedData =
        data
          ?.filter((transaction) => transaction.items) // Filter out any null items
          .map((transaction) => ({
            id: transaction.items.id,
            name: transaction.items.name,
            status: transaction.items.status,
            transaction_id: transaction.id,
          })) || []

      setIssuedItems(transformedData)
      setFilteredItems(transformedData)
    } catch (error: any) {
      console.error("Error fetching items:", error)
      toast({
        title: "Buyumlarni olishda xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsDataLoading(false)
    }
  }, [supabase, selectedEmployee])

  // Initial data fetch
  useEffect(() => {
    const userData = getUser()
    if (!userData) {
      router.push("/")
      return
    }
    setUser(userData)

    fetchEmployees()
  }, [fetchEmployees, router])

  // Fetch items when employee changes
  useEffect(() => {
    if (selectedEmployee) {
      fetchIssuedItems()
    } else {
      setIssuedItems([])
      setFilteredItems([])
    }
  }, [selectedEmployee, fetchIssuedItems])

  // Filter items based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(issuedItems)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = issuedItems.filter((item) => item.name.toLowerCase().includes(query))
    setFilteredItems(filtered)
  }, [searchQuery, issuedItems])

  // Handle item selection
  const handleItemSelect = (itemId: string) => {
    setSelectedItems((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredItems.map((item) => item.id))
    }
  }

  // Handle receive items
  const handleReceiveItems = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "Buyumlar tanlanmagan",
        description: "Kamida bitta buyumni tanlang",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Get selected items data for logging
      const selectedItemsData = issuedItems.filter((item) => selectedItems.includes(item.id))

      // Get transaction IDs for selected items
      const transactionIds = selectedItemsData
        .filter((item) => item.transaction_id)
        .map((item) => item.transaction_id as string)

      // Update transactions with returned_at
      if (transactionIds.length > 0) {
        const { error: updateTransactionError } = await supabase
          .from("item_transactions")
          .update({
            returned_at: new Date().toISOString(),
            // Don't set received_by if it causes foreign key constraint issues
          })
          .in("id", transactionIds)

        if (updateTransactionError) throw updateTransactionError
      }

      // Create new transactions for the return
      const transactions = selectedItems.map((itemId) => ({
        id: crypto.randomUUID(),
        item_id: itemId,
        employee_id: selectedEmployee,
        issued_by: null,
        // Don't set received_by if it causes foreign key constraint issues
        issued_at: null,
        returned_at: new Date().toISOString(),
        status_before: "in_use",
        status_after: "available",
        notes: "Xodimdan qaytarib olindi",
      }))

      // Insert transactions
      const { error: transactionError } = await supabase.from("item_transactions").insert(transactions)

      if (transactionError) throw transactionError

      // Update items status
      const { error: updateError } = await supabase
        .from("items")
        .update({ status: "available" })
        .in("id", selectedItems)

      if (updateError) throw updateError

      // Log admin action for each item
      const employee = employees.find((emp) => emp.id === selectedEmployee)
      const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : "Unknown"

      const logPromises = selectedItemsData.map((item) =>
        logItemReceive(user.id, item.id, selectedEmployee, item.name, employeeName),
      )

      await Promise.all(logPromises)

      toast({
        title: "Buyumlar muvaffaqiyatli qaytarib olindi",
        description: `${selectedItems.length} ta buyum qaytarib olindi`,
      })

      // Reset selection and refresh data
      setSelectedItems([])
      fetchIssuedItems()
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Error receiving items:", error)
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Buyurtma qabul qilish</h2>
          <p className="text-muted-foreground">Xodimlardan buyumlarni qaytarib olish</p>
        </div>
        <Button variant="outline" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Xodimni tanlang</CardTitle>
          <CardDescription>Buyumlarni qaytarib olish uchun xodimni tanlang</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="employee">Xodim</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={isDataLoading}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Xodimni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name} ({employee.department?.name || "Bo'limsiz"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedEmployee && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Xodimga berilgan buyumlar</CardTitle>
            <CardDescription>Qaytarib olish uchun buyumlarni tanlang</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buyumlarni qidirish..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {isDataLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {issuedItems.length === 0
                  ? "Bu xodimga hech qanday buyum berilmagan"
                  : "Qidiruv bo'yicha buyumlar topilmadi"}
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={filteredItems.length > 0 && selectedItems.length === filteredItems.length}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead>Buyum nomi</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={() => handleItemSelect(item.id)}
                              aria-label={`Select ${item.name}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 flex justify-end">
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button disabled={selectedItems.length === 0 || isSubmitting} className="gap-2">
                        <Package className="h-4 w-4" />
                        Buyumlarni qaytarib olish ({selectedItems.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Buyumlarni qaytarib olishni tasdiqlang</DialogTitle>
                        <DialogDescription>
                          Siz {selectedItems.length} ta buyumni qaytarib olmoqchisiz. Bu amalni tasdiqlaysizmi?
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <p className="text-sm font-medium">Qaytarib olinadigan buyumlar:</p>
                        <ul className="mt-2 text-sm">
                          {selectedItems.map((itemId) => {
                            const item = issuedItems.find((i) => i.id === itemId)
                            return (
                              <li key={itemId} className="flex items-center gap-2 py-1">
                                <Plus className="h-3 w-3 text-muted-foreground" />
                                {item?.name}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                          Bekor qilish
                        </Button>
                        <Button onClick={handleReceiveItems} disabled={isSubmitting} className="gap-2">
                          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                          Tasdiqlash
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
