"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, UserPlus, UserCog, Edit, Trash2 } from "lucide-react"

export default function EmployeesPage() {
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [admins, setAdmins] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showEditAdminModal, setShowEditAdminModal] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [usersColumns, setUsersColumns] = useState<string[]>([])
  const [editAdmin, setEditAdmin] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("")
  const [filterDepartment, setFilterDepartment] = useState("all")
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false)
  const [editEmployee, setEditEmployee] = useState<any>(null)

  // Yangi xodim uchun state
  const [newEmployee, setNewEmployee] = useState({
    first_name: "",
    last_name: "",
    department_id: "",
    position: "",
    phone: "",
    email: "",
  })

  // Yangi admin uchun state
  const [newAdmin, setNewAdmin] = useState({
    first_name: "",
    last_name: "",
    position: "admin", // Default qiymat "admin" qilindi
    phone: "",
    user_email: "",
    user_password: "",
    user_role: "admin",
  })

  // Supabase klientini yaratish
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Ma'lumotlarni olish
  const fetchData = async () => {
    try {
      setLoading(true)

      // Xodimlarni olish
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("*, department:department_id(name)")
        .order("last_name")

      if (employeesError) {
        throw employeesError
      }

      // Bo'limlarni olish
      const { data: departmentsData, error: departmentsError } = await supabase
        .from("departments")
        .select("*")
        .order("name")

      if (departmentsError) {
        throw departmentsError
      }

      // Users jadvalini tekshirish
      try {
        // Avval faqat users jadvalidan ma'lumotlarni olish
        const { data: usersData, error: usersError } = await supabase.from("users").select("*")

        if (usersError) {
          console.error("Users jadvalini tekshirishda xatolik:", usersError.message)
        } else if (usersData && usersData.length > 0) {
          // Users jadvalining ustunlarini olish
          const columns = Object.keys(usersData[0])
          setUsersColumns(columns)

          // Har bir user uchun employee ma'lumotlarini olish
          const adminsWithEmployeeData = await Promise.all(
            usersData
              .filter((user) => user.role === "admin" || user.role === "superadmin") // Faqat admin va superadmin rollariga ega foydalanuvchilarni olish
              .map(async (user) => {
                if (user.employee_id) {
                  // Employee ma'lumotlarini olish
                  const { data: employeeData, error: employeeError } = await supabase
                    .from("employees")
                    .select("*, department:department_id(name)")
                    .eq("id", user.employee_id)
                    .single()

                  if (employeeError) {
                    console.error("Employee ma'lumotlarini olishda xatolik:", employeeError.message)
                    return user
                  }

                  return {
                    ...user,
                    employee: employeeData,
                  }
                }
                return user
              }),
          )

          setAdmins(adminsWithEmployeeData)
        }
      } catch (e: any) {
        console.error("Users jadvalini tekshirishda xatolik:", e.message)
      }

      setEmployees(employeesData || [])
      setDepartments(departmentsData || [])
    } catch (error: any) {
      console.error("Ma'lumotlarni olishda xatolik:", error.message)
      setError("Ma'lumotlarni olishda xatolik yuz berdi: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Yangi xodim qo'shish
  const handleCreateEmployee = async () => {
    try {
      if (!newEmployee.first_name || !newEmployee.last_name || !newEmployee.department_id) {
        alert("Ism, familiya va bo'lim kiritilishi shart")
        return
      }

      const { data, error } = await supabase.from("employees").insert([newEmployee]).select()

      if (error) throw error

      // Yangi xodimni qo'shib, ro'yxatni yangilash
      setEmployees([...employees, { ...data[0], department: departments.find((d) => d.id === data[0].department_id) }])

      // Formani tozalash
      setNewEmployee({
        first_name: "",
        last_name: "",
        department_id: "",
        position: "",
        phone: "",
        email: "",
      })

      setShowEmployeeModal(false)
    } catch (error: any) {
      console.error("Xodim qo'shishda xatolik:", error.message)
      alert("Xodim qo'shishda xatolik: " + error.message)
    }
  }

  // Yangi admin qo'shish
  const handleCreateAdmin = async () => {
    try {
      if (!newAdmin.first_name || !newAdmin.last_name || !newAdmin.user_email || !newAdmin.user_password) {
        alert("Ism, familiya, login va parol kiritilishi shart")
        return
      }

      // Default bo'lim ID-sini olish (birinchi bo'lim)
      let defaultDepartmentId = ""
      if (departments.length > 0) {
        defaultDepartmentId = departments[0].id
      } else {
        alert("Bo'limlar mavjud emas. Avval bo'lim yarating.")
        return
      }

      // 1. Avval xodimni yaratish
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .insert([
          {
            first_name: newAdmin.first_name,
            last_name: newAdmin.last_name,
            department_id: defaultDepartmentId, // Default bo'lim ID-si
            position: newAdmin.position,
            phone: newAdmin.phone,
            email: newAdmin.user_email, // User email-ni employee email sifatida ishlatish
          },
        ])
        .select()

      if (employeeError) throw employeeError

      if (!employeeData || employeeData.length === 0) {
        throw new Error("Xodim yaratilmadi")
      }

      // 2. Users jadvaliga yozish
      // Parolni qaysi ustunda saqlash kerakligini aniqlash
      const userData: any = {
        email: newAdmin.user_email,
        role: newAdmin.user_role,
        employee_id: employeeData[0].id,
      }

      // Agar "password" ustuni mavjud bo'lsa, uni ishlatish
      if (usersColumns.includes("password")) {
        userData.password = newAdmin.user_password
      }
      // Agar "pass" ustuni mavjud bo'lsa, uni ishlatish
      else if (usersColumns.includes("pass")) {
        userData.pass = newAdmin.user_password
      }
      // Agar "hashed_password" ustuni mavjud bo'lsa, uni ishlatish
      else if (usersColumns.includes("hashed_password")) {
        userData.hashed_password = newAdmin.user_password
      }
      // Agar "encrypted_password" ustuni mavjud bo'lsa, uni ishlatish
      else if (usersColumns.includes("encrypted_password")) {
        userData.encrypted_password = newAdmin.user_password
      }
      // Agar "password_hash" ustuni mavjud bo'lsa, uni ishlatish
      else if (usersColumns.includes("password_hash")) {
        userData.password_hash = newAdmin.user_password
      }
      // Agar yuqoridagi ustunlardan hech biri mavjud bo'lmasa, parolni saqlamaslik
      else {
        console.warn("Parol saqlash uchun ustun topilmadi")
      }

      const { data: userDataResult, error: userError } = await supabase.from("users").insert([userData]).select()

      if (userError) throw userError

      // Yangi adminni qo'shib, ro'yxatni yangilash
      const newAdminWithDepartment = {
        ...userDataResult[0],
        employee: {
          ...employeeData[0],
          department: departments.find((d) => d.id === defaultDepartmentId),
        },
      }
      setAdmins([...admins, newAdminWithDepartment])

      // Yangi xodimni qo'shib, ro'yxatni yangilash
      setEmployees([
        ...employees,
        { ...employeeData[0], department: departments.find((d) => d.id === defaultDepartmentId) },
      ])

      // Formani tozalash
      setNewAdmin({
        first_name: "",
        last_name: "",
        position: "admin",
        phone: "",
        user_email: "",
        user_password: "",
        user_role: "admin",
      })

      setShowAdminModal(false)
    } catch (error: any) {
      console.error("Admin qo'shishda xatolik:", error.message)
      alert("Admin qo'shishda xatolik: " + error.message)
    }
  }

  // Adminni tahrirlash
  const handleUpdateAdmin = async () => {
    try {
      if (!editAdmin || !editAdmin.employee || !editAdmin.email) {
        alert("Admin ma'lumotlari to'liq emas")
        return
      }

      // 1. Xodim ma'lumotlarini yangilash
      const { error: employeeError } = await supabase
        .from("employees")
        .update({
          first_name: editAdmin.employee.first_name,
          last_name: editAdmin.employee.last_name,
          position: editAdmin.employee.position,
          phone: editAdmin.employee.phone,
          email: editAdmin.email, // User email-ni employee email sifatida ishlatish
          department_id: editAdmin.employee.department_id,
        })
        .eq("id", editAdmin.employee.id)

      if (employeeError) throw employeeError

      // 2. User ma'lumotlarini yangilash
      const userData: any = {
        email: editAdmin.email,
        role: editAdmin.role,
      }

      // Agar parol o'zgartirilgan bo'lsa
      if (editAdmin.new_password) {
        // Agar "password" ustuni mavjud bo'lsa, uni ishlatish
        if (usersColumns.includes("password")) {
          userData.password = editAdmin.new_password
        }
        // Agar "pass" ustuni mavjud bo'lsa, uni ishlatish
        else if (usersColumns.includes("pass")) {
          userData.pass = editAdmin.new_password
        }
        // Agar "hashed_password" ustuni mavjud bo'lsa, uni ishlatish
        else if (usersColumns.includes("hashed_password")) {
          userData.hashed_password = editAdmin.new_password
        }
        // Agar "encrypted_password" ustuni mavjud bo'lsa, uni ishlatish
        else if (usersColumns.includes("encrypted_password")) {
          userData.encrypted_password = editAdmin.new_password
        }
        // Agar "password_hash" ustuni mavjud bo'lsa, uni ishlatish
        else if (usersColumns.includes("password_hash")) {
          userData.password_hash = editAdmin.new_password
        }
      }

      const { error: userError } = await supabase.from("users").update(userData).eq("id", editAdmin.id)

      if (userError) throw userError

      // Ma'lumotlarni yangilash (sahifani qayta yuklamasdan)
      const updatedAdmins = admins.map((admin) => {
        if (admin.id === editAdmin.id) {
          // Yangilangan admin ma'lumotlari
          const updatedAdmin = {
            ...admin,
            email: editAdmin.email,
            role: editAdmin.role,
            employee: {
              ...admin.employee,
              first_name: editAdmin.employee.first_name,
              last_name: editAdmin.employee.last_name,
              position: editAdmin.employee.position,
              phone: editAdmin.employee.phone,
              email: editAdmin.email,
              department_id: editAdmin.employee.department_id,
              department: departments.find((d) => d.id === editAdmin.employee.department_id),
            },
          }
          return updatedAdmin
        }
        return admin
      })

      setAdmins(updatedAdmins)

      // Xodimlar ro'yxatini ham yangilash
      const updatedEmployees = employees.map((employee) => {
        if (employee.id === editAdmin.employee.id) {
          return {
            ...employee,
            first_name: editAdmin.employee.first_name,
            last_name: editAdmin.employee.last_name,
            position: editAdmin.employee.position,
            phone: editAdmin.employee.phone,
            email: editAdmin.email,
            department_id: editAdmin.employee.department_id,
            department: departments.find((d) => d.id === editAdmin.employee.department_id),
          }
        }
        return employee
      })

      setEmployees(updatedEmployees)
      setShowEditAdminModal(false)
    } catch (error: any) {
      console.error("Admin ma'lumotlarini yangilashda xatolik:", error.message)
      alert("Admin ma'lumotlarini yangilashda xatolik: " + error.message)
    }
  }

  // Adminni o'chirish
  const handleDeleteAdmin = async (adminId: string, employeeId: string) => {
    try {
      if (!confirm("Haqiqatan ham bu adminni o'chirmoqchimisiz?")) {
        return
      }

      // 1. Avval admin_activities jadvalidan tegishli yozuvlarni o'chirish
      const { error: activitiesError } = await supabase.from("admin_activities").delete().eq("user_id", adminId)

      if (activitiesError) {
        console.error("Admin faoliyatlarini o'chirishda xatolik:", activitiesError.message)
        throw activitiesError
      }

      // 2. item_transactions jadvalidan tegishli yozuvlarni o'chirish
      const { error: transactionsError } = await supabase.from("item_transactions").delete().eq("user_id", adminId)

      if (transactionsError) {
        console.error("Item transactionlarni o'chirishda xatolik:", transactionsError.message)
        throw transactionsError
      }

      // 3. reports jadvalidan tegishli yozuvlarni o'chirish
      const { error: reportsError } = await supabase.from("reports").delete().eq("user_created_by", adminId)

      if (reportsError) {
        console.error("Reportlarni o'chirishda xatolik:", reportsError.message)
        throw reportsError
      }

      // 4. Keyin user jadvalidan o'chirish
      const { error: userError } = await supabase.from("users").delete().eq("id", adminId)

      if (userError) throw userError

      // 5. Keyin employee jadvalidan o'chirish
      const { error: employeeError } = await supabase.from("employees").delete().eq("id", employeeId)

      if (employeeError) throw employeeError

      // Adminlar ro'yxatini yangilash
      setAdmins(admins.filter((admin) => admin.id !== adminId))

      // Xodimlar ro'yxatini yangilash
      setEmployees(employees.filter((employee) => employee.id !== employeeId))
    } catch (error: any) {
      console.error("Adminni o'chirishda xatolik:", error.message)
      alert("Adminni o'chirishda xatolik: " + error.message)
    }
  }

  // Xodimni tahrirlash
  const handleUpdateEmployee = async () => {
    try {
      if (!editEmployee || !editEmployee.id) {
        alert("Xodim ma'lumotlari to'liq emas")
        return
      }

      const { error } = await supabase
        .from("employees")
        .update({
          first_name: editEmployee.first_name,
          last_name: editEmployee.last_name,
          position: editEmployee.position,
          phone: editEmployee.phone,
          email: editEmployee.email,
          department_id: editEmployee.department_id,
        })
        .eq("id", editEmployee.id)

      if (error) throw error

      // Ma'lumotlarni yangilash (sahifani qayta yuklamasdan)
      const updatedEmployees = employees.map((employee) => {
        if (employee.id === editEmployee.id) {
          return {
            ...employee,
            first_name: editEmployee.first_name,
            last_name: editEmployee.last_name,
            position: editEmployee.position,
            phone: editEmployee.phone,
            email: editEmployee.email,
            department_id: editEmployee.department_id,
            department: departments.find((d) => d.id === editEmployee.department_id),
          }
        }
        return employee
      })

      setEmployees(updatedEmployees)

      // Adminlar ro'yxatini ham yangilash (agar bu xodim admin bo'lsa)
      const updatedAdmins = admins.map((admin) => {
        if (admin.employee && admin.employee.id === editEmployee.id) {
          return {
            ...admin,
            employee: {
              ...admin.employee,
              first_name: editEmployee.first_name,
              last_name: editEmployee.last_name,
              position: editEmployee.position,
              phone: editEmployee.phone,
              email: editEmployee.email,
              department_id: editEmployee.department_id,
              department: departments.find((d) => d.id === editEmployee.department_id),
            },
          }
        }
        return admin
      })

      setAdmins(updatedAdmins)
      setShowEditEmployeeModal(false)
    } catch (error: any) {
      console.error("Xodim ma'lumotlarini yangilashda xatolik:", error.message)
      alert("Xodim ma'lumotlarini yangilashda xatolik: " + error.message)
    }
  }

  // Xodimni o'chirish
  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      if (!confirm("Haqiqatan ham bu xodimni o'chirmoqchimisiz?")) {
        return
      }

      // Avval tekshirish - bu xodim admin emasmi?
      const { data: userData, error: userCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("employee_id", employeeId)

      if (userCheckError) throw userCheckError

      if (userData && userData.length > 0) {
        alert("Bu xodim admin hisoblanadi. Avval adminlar ro'yxatidan o'chiring.")
        return
      }

      // Xodimni o'chirish
      const { error: employeeError } = await supabase.from("employees").delete().eq("id", employeeId)

      if (employeeError) throw employeeError

      // Xodimlar ro'yxatini yangilash
      setEmployees(employees.filter((employee) => employee.id !== employeeId))
    } catch (error: any) {
      console.error("Xodimni o'chirishda xatolik:", error.message)
      alert("Xodimni o'chirishda xatolik: " + error.message)
    }
  }

  // Loading holatini ko'rsatish
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Xatolikni ko'rsatish
  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive">
        <p className="font-medium">{error}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Xodimlar boshqaruvi</h1>

        <div className="flex space-x-4">
          <Button onClick={() => setShowEmployeeModal(true)} className="gap-2">
            <UserPlus size={16} />
            Hodim qo'shish
          </Button>

          <Button onClick={() => setShowAdminModal(true)} variant="secondary" className="gap-2">
            <UserCog size={16} />
            Admin qo'shish
          </Button>
        </div>
      </div>

      {/* Adminlar jadvali */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Adminlar</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Qidirish va filtrlash */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Qidirish..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Rolni tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha rollar</SelectItem>
                <SelectItem value="admin">Faqat adminlar</SelectItem>
                <SelectItem value="superadmin">Faqat superadminlar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {admins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Adminlar mavjud emas</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>F.I.O</TableHead>
                    <TableHead>Bo'lim</TableHead>
                    <TableHead>Lavozim</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="w-[100px]">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins
                    .filter((admin) => {
                      // Rolga ko'ra filtrlash
                      if (filterRole !== "all" && admin.role !== filterRole) {
                        return false
                      }

                      // Qidirish
                      const searchLower = searchTerm.toLowerCase()
                      return (
                        searchTerm === "" ||
                        (admin.employee?.first_name && admin.employee.first_name.toLowerCase().includes(searchLower)) ||
                        (admin.employee?.last_name && admin.employee.last_name.toLowerCase().includes(searchLower)) ||
                        (admin.email && admin.email.toLowerCase().includes(searchLower)) ||
                        (admin.employee?.phone && admin.employee.phone.toLowerCase().includes(searchLower))
                      )
                    })
                    .map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">
                          {admin.employee?.last_name} {admin.employee?.first_name}
                        </TableCell>
                        <TableCell>{admin.employee?.department?.name || "-"}</TableCell>
                        <TableCell>{admin.employee?.position}</TableCell>
                        <TableCell>{admin.employee?.phone}</TableCell>
                        <TableCell>{admin.employee?.email}</TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          <Badge variant={admin.role === "superadmin" ? "destructive" : "secondary"}>
                            {admin.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditAdmin({
                                  ...admin,
                                  new_password: "", // Yangi parol uchun maydon
                                })
                                setShowEditAdminModal(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteAdmin(admin.id, admin.employee?.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Xodimlar jadvali */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Xodimlar</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Qidirish va filtrlash */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Qidirish..."
                className="pl-8"
                value={employeeSearchTerm}
                onChange={(e) => setEmployeeSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Bo'limni tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha bo'limlar</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Xodimlar mavjud emas</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>F.I.O</TableHead>
                    <TableHead>Bo'lim</TableHead>
                    <TableHead>Lavozim</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[100px]">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees
                    .filter((employee) => {
                      // Bo'limga ko'ra filtrlash
                      if (filterDepartment !== "all" && employee.department_id !== filterDepartment) {
                        return false
                      }

                      // Qidirish
                      const searchLower = employeeSearchTerm.toLowerCase()
                      return (
                        employeeSearchTerm === "" ||
                        (employee.first_name && employee.first_name.toLowerCase().includes(searchLower)) ||
                        (employee.last_name && employee.last_name.toLowerCase().includes(searchLower)) ||
                        (employee.email && employee.email.toLowerCase().includes(searchLower)) ||
                        (employee.phone && employee.phone.toLowerCase().includes(searchLower))
                      )
                    })
                    .map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          {employee.last_name} {employee.first_name}
                        </TableCell>
                        <TableCell>{employee.department?.name || "-"}</TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>{employee.phone}</TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditEmployee({
                                  ...employee,
                                })
                                setShowEditEmployeeModal(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteEmployee(employee.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Xodim qo'shish modali */}
      <Dialog open={showEmployeeModal} onOpenChange={setShowEmployeeModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yangi xodim qo'shish</DialogTitle>
            <DialogDescription>
              Yangi xodim ma'lumotlarini kiriting. Yulduzcha (*) bilan belgilangan maydonlar to'ldirilishi shart.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="first_name" className="text-sm font-medium">
                  Ism *
                </label>
                <Input
                  id="first_name"
                  value={newEmployee.first_name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="last_name" className="text-sm font-medium">
                  Familiya *
                </label>
                <Input
                  id="last_name"
                  value={newEmployee.last_name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="department" className="text-sm font-medium">
                Bo'lim *
              </label>
              <Select
                value={newEmployee.department_id}
                onValueChange={(value) => setNewEmployee({ ...newEmployee, department_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bo'limni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="position" className="text-sm font-medium">
                Lavozim
              </label>
              <Input
                id="position"
                value={newEmployee.position}
                onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Telefon
              </label>
              <Input
                id="phone"
                value={newEmployee.phone}
                onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmployeeModal(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleCreateEmployee}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin qo'shish modali */}
      <Dialog open={showAdminModal} onOpenChange={setShowAdminModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yangi admin qo'shish</DialogTitle>
            <DialogDescription>
              Yangi admin ma'lumotlarini kiriting. Yulduzcha (*) bilan belgilangan maydonlar to'ldirilishi shart.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="admin_first_name" className="text-sm font-medium">
                  Ism *
                </label>
                <Input
                  id="admin_first_name"
                  value={newAdmin.first_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="admin_last_name" className="text-sm font-medium">
                  Familiya *
                </label>
                <Input
                  id="admin_last_name"
                  value={newAdmin.last_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="admin_phone" className="text-sm font-medium">
                Telefon
              </label>
              <Input
                id="admin_phone"
                value={newAdmin.phone}
                onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
              />
            </div>

            <div className="border-t pt-4 mt-2">
              <h3 className="font-medium mb-3">Foydalanuvchi ma'lumotlari</h3>

              <div className="space-y-2">
                <label htmlFor="admin_email" className="text-sm font-medium">
                  Login (email) *
                </label>
                <Input
                  id="admin_email"
                  type="email"
                  value={newAdmin.user_email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, user_email: e.target.value })}
                />
              </div>

              <div className="space-y-2 mt-4">
                <label htmlFor="admin_password" className="text-sm font-medium">
                  Parol *
                </label>
                <Input
                  id="admin_password"
                  type="password"
                  value={newAdmin.user_password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, user_password: e.target.value })}
                />
              </div>

              <div className="space-y-2 mt-4">
                <label htmlFor="admin_role" className="text-sm font-medium">
                  Rol
                </label>
                <Select
                  value={newAdmin.user_role}
                  onValueChange={(value) => setNewAdmin({ ...newAdmin, user_role: value as "admin" | "superadmin" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rolni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdminModal(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleCreateAdmin}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin tahrirlash modali */}
      <Dialog open={showEditAdminModal} onOpenChange={setShowEditAdminModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adminni tahrirlash</DialogTitle>
            <DialogDescription>
              Admin ma'lumotlarini tahrirlang. Yulduzcha (*) bilan belgilangan maydonlar to'ldirilishi shart.
            </DialogDescription>
          </DialogHeader>
          {editAdmin && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit_admin_first_name" className="text-sm font-medium">
                    Ism *
                  </label>
                  <Input
                    id="edit_admin_first_name"
                    value={editAdmin.employee?.first_name || ""}
                    onChange={(e) =>
                      setEditAdmin({
                        ...editAdmin,
                        employee: { ...editAdmin.employee, first_name: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit_admin_last_name" className="text-sm font-medium">
                    Familiya *
                  </label>
                  <Input
                    id="edit_admin_last_name"
                    value={editAdmin.employee?.last_name || ""}
                    onChange={(e) =>
                      setEditAdmin({
                        ...editAdmin,
                        employee: { ...editAdmin.employee, last_name: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit_admin_department" className="text-sm font-medium">
                  Bo'lim *
                </label>
                <Select
                  value={editAdmin.employee?.department_id || ""}
                  onValueChange={(value) =>
                    setEditAdmin({
                      ...editAdmin,
                      employee: { ...editAdmin.employee, department_id: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Bo'limni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit_admin_position" className="text-sm font-medium">
                  Lavozim
                </label>
                <Input
                  id="edit_admin_position"
                  value={editAdmin.employee?.position || ""}
                  onChange={(e) =>
                    setEditAdmin({
                      ...editAdmin,
                      employee: { ...editAdmin.employee, position: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="edit_admin_phone" className="text-sm font-medium">
                  Telefon
                </label>
                <Input
                  id="edit_admin_phone"
                  value={editAdmin.employee?.phone || ""}
                  onChange={(e) =>
                    setEditAdmin({
                      ...editAdmin,
                      employee: { ...editAdmin.employee, phone: e.target.value },
                    })
                  }
                />
              </div>

              <div className="border-t pt-4 mt-2">
                <h3 className="font-medium mb-3">Foydalanuvchi ma'lumotlari</h3>

                <div className="space-y-2">
                  <label htmlFor="edit_admin_email" className="text-sm font-medium">
                    Login (email) *
                  </label>
                  <Input
                    id="edit_admin_email"
                    type="email"
                    value={editAdmin.email || ""}
                    onChange={(e) => setEditAdmin({ ...editAdmin, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2 mt-4">
                  <label htmlFor="edit_admin_new_password" className="text-sm font-medium">
                    Yangi parol (o'zgartirish uchun)
                  </label>
                  <Input
                    id="edit_admin_new_password"
                    type="password"
                    value={editAdmin.new_password || ""}
                    onChange={(e) => setEditAdmin({ ...editAdmin, new_password: e.target.value })}
                    placeholder="Parolni o'zgartirish uchun yangi parolni kiriting"
                  />
                </div>

                <div className="space-y-2 mt-4">
                  <label htmlFor="edit_admin_role" className="text-sm font-medium">
                    Rol
                  </label>
                  <Select
                    value={editAdmin.role || "admin"}
                    onValueChange={(value) => setEditAdmin({ ...editAdmin, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Rolni tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Superadmin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditAdminModal(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleUpdateAdmin}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Xodim tahrirlash modali */}
      <Dialog open={showEditEmployeeModal} onOpenChange={setShowEditEmployeeModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Xodimni tahrirlash</DialogTitle>
            <DialogDescription>
              Xodim ma'lumotlarini tahrirlang. Yulduzcha (*) bilan belgilangan maydonlar to'ldirilishi shart.
            </DialogDescription>
          </DialogHeader>
          {editEmployee && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit_employee_first_name" className="text-sm font-medium">
                    Ism *
                  </label>
                  <Input
                    id="edit_employee_first_name"
                    value={editEmployee.first_name || ""}
                    onChange={(e) => setEditEmployee({ ...editEmployee, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit_employee_last_name" className="text-sm font-medium">
                    Familiya *
                  </label>
                  <Input
                    id="edit_employee_last_name"
                    value={editEmployee.last_name || ""}
                    onChange={(e) => setEditEmployee({ ...editEmployee, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit_employee_department" className="text-sm font-medium">
                  Bo'lim *
                </label>
                <Select
                  value={editEmployee.department_id || ""}
                  onValueChange={(value) => setEditEmployee({ ...editEmployee, department_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Bo'limni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit_employee_position" className="text-sm font-medium">
                  Lavozim
                </label>
                <Input
                  id="edit_employee_position"
                  value={editEmployee.position || ""}
                  onChange={(e) => setEditEmployee({ ...editEmployee, position: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="edit_employee_phone" className="text-sm font-medium">
                  Telefon
                </label>
                <Input
                  id="edit_employee_phone"
                  value={editEmployee.phone || ""}
                  onChange={(e) => setEditEmployee({ ...editEmployee, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="edit_employee_email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="edit_employee_email"
                  type="email"
                  value={editEmployee.email || ""}
                  onChange={(e) => setEditEmployee({ ...editEmployee, email: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditEmployeeModal(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleUpdateEmployee}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
