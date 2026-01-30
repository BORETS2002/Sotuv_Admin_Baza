"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase-client"
import type { Item, Department } from "@/types/database"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { DataLoader } from "@/components/data-loader"

type ItemWithRelations = Item & {
  department: Department
}

export default function ItemsPage() {
  const [items, setItems] = useState<ItemWithRelations[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const [newItem, setNewItem] = useState({
    name: "",
    department_id: "",
    serial_number: "",
    status: "available",
    condition: "",
  })

  const [editItem, setEditItem] = useState<ItemWithRelations | null>(null)

  useEffect(() => {
    fetchItems()
    fetchDepartments()
  }, [])

  const fetchItems = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.from("items").select("*, departments(*)").order("name")

      if (error) throw error

      // Transform the data to match the expected format
      const transformedData = data.map((item) => ({
        ...item,
        department: item.departments,
      }))

      setItems(transformedData || [])
    } catch (error: any) {
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from("departments").select("*").order("name")

      if (error) throw error
      setDepartments(data || [])
    } catch (error: any) {
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleCreateItem = async () => {
    try {
      if (!newItem.name.trim() || !newItem.department_id || !newItem.serial_number) {
        toast({
          title: "Xatolik",
          description: "Barcha majburiy maydonlarni to'ldiring",
          variant: "destructive",
        })
        return
      }

      // Try to insert the item
      try {
        const { data, error } = await supabase
          .from("items")
          .insert([
            {
              name: newItem.name,
              department_id: newItem.department_id,
              serial_number: newItem.serial_number,
              status: newItem.status,
              condition: newItem.condition,
              added_by: user?.id,
            },
          ])
          .select()

        if (error) throw error

        toast({
          title: "Muvaffaqiyatli",
          description: "Mahsulot muvaffaqiyatli qo'shildi",
        })

        setNewItem({
          name: "",
          department_id: "",
          serial_number: "",
          status: "available",
          condition: "",
        })
        setIsCreateModalOpen(false)
        fetchItems()
      } catch (insertError) {
        console.error("Error inserting item:", insertError)
        toast({
          title: "Xatolik yuz berdi",
          description: "Mahsulotni saqlashda xatolik yuz berdi",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("General error in handleCreateItem:", error)
      toast({
        title: "Xatolik yuz berdi",
        description: error.message || "Noma'lum xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const handleUpdateItem = async () => {
    try {
      if (!editItem || !editItem.name.trim() || !editItem.department_id || !editItem.serial_number) {
        toast({
          title: "Xatolik",
          description: "Barcha majburiy maydonlarni to'ldiring",
          variant: "destructive",
        })
        return
      }

      // Buyum holatini yangilash
      const { error } = await supabase
        .from("items")
        .update({
          name: editItem.name,
          department_id: editItem.department_id,
          serial_number: editItem.serial_number,
          status: editItem.status,
          condition: editItem.condition,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editItem.id)

      if (error) throw error

      toast({
        title: "Muvaffaqiyatli",
        description: "Inventar ma'lumotlari yangilandi",
      })

      setEditItem(null)
      setIsEditModalOpen(false)
      fetchItems()
    } catch (error: any) {
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteItem = async () => {
    try {
      if (!itemToDelete) return

      // Check if item has any transactions
      const { count: transactionCount, error: transactionError } = await supabase
        .from("item_transactions")
        .select("*", { count: "exact", head: true })
        .eq("item_id", itemToDelete)

      if (transactionError) throw transactionError

      if (transactionCount && transactionCount > 0) {
        toast({
          title: "Xatolik",
          description: "Bu inventar uchun operatsiyalar mavjud. Avval operatsiyalarni o'chiring.",
          variant: "destructive",
        })
        setIsDeleteDialogOpen(false)
        setItemToDelete(null)
        return
      }

      const { error } = await supabase.from("items").delete().eq("id", itemToDelete)

      if (error) throw error

      toast({
        title: "Muvaffaqiyatli",
        description: "Inventar o'chirildi",
      })

      setIsDeleteDialogOpen(false)
      setItemToDelete(null)
      fetchItems()
    } catch (error: any) {
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const openEditModal = (item: ItemWithRelations) => {
    setEditItem(item)
    setIsEditModalOpen(true)
  }

  const openDeleteDialog = (id: string) => {
    setItemToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "available":
        return "success"
      case "in_use":
        return "default"
      case "damaged":
        return "destructive"
      case "under_repair":
        return "warning"
      case "discarded":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "Mavjud"
      case "in_use":
        return "Foydalanishda"
      case "damaged":
        return "Shikastlangan"
      case "under_repair":
        return "Ta'mirda"
      case "discarded":
        return "Chiqitga chiqarilgan"
      default:
        return status
    }
  }

  const toggleStatusFilter = (status: string) => {
    setStatusFilter((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]))
  }

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter([])
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.department.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.condition && item.condition.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(item.status)

    return matchesSearch && matchesStatus
  })

  // Check if user is superadmin directly from the user context
  const isSuperAdmin = user?.role === "superadmin"

  // Buyum holatini o'zgartirish uchun admin va superadminlarga ruxsat berish
  const isAdmin = user?.role === "admin" || user?.role === "superadmin"

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Inventar ro'yxati</h1>

      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          <span className="mr-2">+</span>
          Yangi buyum qo'shish
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Qidirish..."
          className="px-4 py-2 border rounded-md w-full max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <DataLoader
        isLoading={isLoading}
        isEmpty={items.length === 0}
        loadingMessage="Inventar ma'lumotlari yuklanmoqda..."
        emptyMessage="Inventar ro'yxati bo'sh"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border-b text-left">Nomi</th>
                <th className="py-2 px-4 border-b text-left">Bo'lim</th>
                <th className="py-2 px-4 border-b text-left">Seriya raqami</th>
                <th className="py-2 px-4 border-b text-left">Holati</th>
                <th className="py-2 px-4 border-b text-left">Sharoiti</th>
                {isAdmin && <th className="py-2 px-4 border-b text-right">Amallar</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="text-center py-4">
                    Natija topilmadi
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b font-medium">{item.name}</td>
                    <td className="py-2 px-4 border-b">{item.department?.name || "Bo'lim ko'rsatilmagan"}</td>
                    <td className="py-2 px-4 border-b">{item.serial_number}</td>
                    <td className="py-2 px-4 border-b">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          item.status === "available"
                            ? "bg-green-100 text-green-800"
                            : item.status === "in_use"
                              ? "bg-blue-100 text-blue-800"
                              : item.status === "damaged"
                                ? "bg-red-100 text-red-800"
                                : item.status === "under_repair"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {getStatusText(item.status)}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b">{item.condition || "-"}</td>
                    {isAdmin && (
                      <td className="py-2 px-4 border-b text-right">
                        <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-800 mr-2">
                          Tahrirlash
                        </button>
                        <button onClick={() => openDeleteDialog(item.id)} className="text-red-600 hover:text-red-800">
                          O'chirish
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataLoader>

      {/* Create Item Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Yangi inventar qo'shish</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomi *</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bo'lim *</label>
                <select
                  value={newItem.department_id}
                  onChange={(e) => setNewItem({ ...newItem, department_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Bo'limni tanlang</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seriya raqami *</label>
                <input
                  type="text"
                  value={newItem.serial_number}
                  onChange={(e) => setNewItem({ ...newItem, serial_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Holati</label>
                <select
                  value={newItem.status}
                  onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="available">Mavjud</option>
                  <option value="in_use">Foydalanishda</option>
                  <option value="damaged">Shikastlangan</option>
                  <option value="under_repair">Ta'mirda</option>
                  <option value="discarded">Chiqitga chiqarilgan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sharoiti</label>
                <textarea
                  value={newItem.condition}
                  onChange={(e) => setNewItem({ ...newItem, condition: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Inventar sharoiti haqida qo'shimcha ma'lumot"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-2">
              <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 border rounded-md">
                Bekor qilish
              </button>
              <button
                onClick={handleCreateItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {isEditModalOpen && editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Inventarni tahrirlash</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomi *</label>
                <input
                  type="text"
                  value={editItem.name}
                  onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bo'lim *</label>
                <select
                  value={editItem.department_id}
                  onChange={(e) => setEditItem({ ...editItem, department_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Bo'limni tanlang</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seriya raqami *</label>
                <input
                  type="text"
                  value={editItem.serial_number}
                  onChange={(e) => setEditItem({ ...editItem, serial_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Holati</label>
                <select
                  value={editItem.status}
                  onChange={(e) => setEditItem({ ...editItem, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="available">Mavjud</option>
                  <option value="in_use">Foydalanishda</option>
                  <option value="damaged">Shikastlangan</option>
                  <option value="under_repair">Ta'mirda</option>
                  <option value="discarded">Chiqitga chiqarilgan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sharoiti</label>
                <textarea
                  value={editItem.condition || ""}
                  onChange={(e) => setEditItem({ ...editItem, condition: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Inventar sharoiti haqida qo'shimcha ma'lumot"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-2">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border rounded-md">
                Bekor qilish
              </button>
              <button
                onClick={handleUpdateItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Inventarni o'chirish</h2>
            <p className="mb-6">Siz rostdan ham bu inventarni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.</p>

            <div className="flex justify-end space-x-2">
              <button onClick={() => setIsDeleteDialogOpen(false)} className="px-4 py-2 border rounded-md">
                Bekor qilish
              </button>
              <button
                onClick={handleDeleteItem}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
