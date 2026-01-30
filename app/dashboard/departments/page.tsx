"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase-client"
import type { Department } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newDepartment, setNewDepartment] = useState({ name: "", description: "" })
  const [editDepartment, setEditDepartment] = useState<Department | null>(null)
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.from("departments").select("*").order("name")

      if (error) throw error
      setDepartments(data || [])
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

  const handleCreateDepartment = async () => {
    try {
      if (!newDepartment.name.trim()) {
        toast({
          title: "Xatolik",
          description: "Bo'lim nomi kiritilishi shart",
          variant: "destructive",
        })
        return
      }

      const { data, error } = await supabase
        .from("departments")
        .insert([
          {
            name: newDepartment.name,
            description: newDepartment.description || null,
          },
        ])
        .select()

      if (error) throw error

      toast({
        title: "Muvaffaqiyatli",
        description: "Bo'lim yaratildi",
      })

      setNewDepartment({ name: "", description: "" })
      fetchDepartments()
    } catch (error: any) {
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleUpdateDepartment = async () => {
    try {
      if (!editDepartment || !editDepartment.name.trim()) {
        toast({
          title: "Xatolik",
          description: "Bo'lim nomi kiritilishi shart",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from("departments")
        .update({
          name: editDepartment.name,
          description: editDepartment.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editDepartment.id)

      if (error) throw error

      toast({
        title: "Muvaffaqiyatli",
        description: "Bo'lim yangilandi",
      })

      setEditDepartment(null)
      fetchDepartments()
    } catch (error: any) {
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteDepartment = async (id: string) => {
    try {
      // Check if department has employees
      const { count: employeeCount, error: employeeError } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("department_id", id)

      if (employeeError) throw employeeError

      if (employeeCount && employeeCount > 0) {
        toast({
          title: "Xatolik",
          description: "Bu bo'limda xodimlar mavjud. Avval xodimlarni boshqa bo'limga o'tkazing.",
          variant: "destructive",
        })
        return
      }

      // Check if department has items
      const { count: itemCount, error: itemError } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("department_id", id)

      if (itemError) throw itemError

      if (itemCount && itemCount > 0) {
        toast({
          title: "Xatolik",
          description: "Bu bo'limda inventar mavjud. Avval inventarni boshqa bo'limga o'tkazing.",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("departments").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Muvaffaqiyatli",
        description: "Bo'lim o'chirildi",
      })

      fetchDepartments()
    } catch (error: any) {
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bo&apos;limlar</h1>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yangi bo&apos;lim
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yangi bo&apos;lim yaratish</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nomi</Label>
                <Input
                  id="name"
                  value={newDepartment.name}
                  onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Tavsif</Label>
                <Textarea
                  id="description"
                  value={newDepartment.description}
                  onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Bekor qilish</Button>
              </DialogClose>
              <Button onClick={handleCreateDepartment}>Saqlash</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {departments.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Bo&apos;limlar mavjud emas</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomi</TableHead>
              <TableHead>Tavsif</TableHead>
              <TableHead className="w-[100px]">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((department) => (
              <TableRow key={department.id}>
                <TableCell className="font-medium">{department.name}</TableCell>
                <TableCell>{department.description || "-"}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setEditDepartment(department)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Bo&apos;limni tahrirlash</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-name">Nomi</Label>
                            <Input
                              id="edit-name"
                              value={editDepartment?.name || ""}
                              onChange={(e) =>
                                setEditDepartment((prev) => (prev ? { ...prev, name: e.target.value } : null))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-description">Tavsif</Label>
                            <Textarea
                              id="edit-description"
                              value={editDepartment?.description || ""}
                              onChange={(e) =>
                                setEditDepartment((prev) => (prev ? { ...prev, description: e.target.value } : null))
                              }
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Bekor qilish</Button>
                          </DialogClose>
                          <Button onClick={handleUpdateDepartment}>Saqlash</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Haqiqatan ham bu bo'limni o'chirmoqchimisiz?")) {
                          handleDeleteDepartment(department.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
