"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import { getAllPermissions, getRolePermissions, addUserPermission, removeUserPermission } from "@/lib/permissions"
import { logAdminActivity } from "@/lib/admin-logger"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { User, Users, Building2, Eye, ReceiptIcon, Send, Settings, AlertTriangle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { getUser } from "@/lib/session-manager"

type Permission = {
  id: string
  name: string
  description: string
}

type UserType = {
  id: string
  email: string
  role: string
}

type Department = {
  id: string
  name: string
}

export default function PermissionsPage() {
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [selectedRole, setSelectedRole] = useState<string>("admin")
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string>("")
  const [departmentPermissions, setDepartmentPermissions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0) // For forcing re-renders

  // Authentication state from contexts and localStorage
  const { user: authContextUser } = useAuth()
  const [sessionUser, setSessionUser] = useState<any>(null)

  // IP manzilni olish uchun
  const [ipAddress, setIpAddress] = useState("127.0.0.1")

  // Get current user from multiple sources
  const getCurrentUser = () => {
    // First try getting from auth context
    if (authContextUser?.id) {
      return authContextUser
    }

    // Then try getting from session manager
    if (sessionUser?.id) {
      return sessionUser
    }

    // Then try getting directly from localStorage
    try {
      const localUser = localStorage.getItem("user")
      if (localUser) {
        const parsedUser = JSON.parse(localUser)
        if (parsedUser?.id) {
          return parsedUser
        }
      }
    } catch (e) {
      console.error("Error parsing user from localStorage:", e)
    }

    // Lastly get from Supabase (this is async, so it won't return immediately)
    return null
  }

  const currentUser = getCurrentUser()

  // Load session user from sessionStorage/localStorage
  useEffect(() => {
    const localUser = getUser()
    if (localUser) {
      setSessionUser(localUser)
    }
  }, [refreshKey])

  useEffect(() => {
    // IP manzilni olish
    fetch("https://api.ipify.org?format=json")
      .then((response) => response.json())
      .then((data) => setIpAddress(data.ip))
      .catch(() => setIpAddress("127.0.0.1"))
  }, [])

  // Refresh auth state from Supabase
  const refreshAuthState = async () => {
    try {
      setLoading(true)
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        console.error("Auth refresh error:", error)
        return
      }

      if (data?.user) {
        // Get full user data from our users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .single()

        if (userError) {
          console.error("User data fetch error:", userError)
          return
        }

        if (userData) {
          // Update localStorage
          localStorage.setItem("user", JSON.stringify(userData))
          setSessionUser(userData)
          toast({
            title: "Muvaffaqiyatli",
            description: "Foydalanuvchi ma'lumotlari yangilandi",
          })
        }
      }
    } catch (e) {
      console.error("Error refreshing auth state:", e)
    } finally {
      setLoading(false)
      setRefreshKey((prev) => prev + 1) // Force re-render
    }
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        // Barcha ruxsatlarni olish
        const perms = await getAllPermissions()
        setPermissions(perms)

        // Foydalanuvchilarni olish - employees jadvaliga bog'lanishsiz
        const supabase = getSupabaseClient()
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, email, role")
          .order("email")

        if (userError) {
          console.error("Foydalanuvchilarni olishda xatolik:", userError)
          toast({
            title: "Xatolik",
            description: "Foydalanuvchilarni yuklashda xatolik yuz berdi",
            variant: "destructive",
          })
          setError("Foydalanuvchilarni yuklashda xatolik yuz berdi")
        } else {
          setUsers(userData as UserType[])
        }

        // Admin roli ruxsatlarini olish
        const adminPerms = await getRolePermissions("admin")
        setRolePermissions(adminPerms.map((p) => p.id))
      } catch (error) {
        console.error("Ma'lumotlarni yuklashda xatolik:", error)
        setError("Ma'lumotlarni yuklashda xatolik yuz berdi")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [refreshKey])

  // Foydalanuvchi tanlanganda uning ruxsatlarini olish
  useEffect(() => {
    async function fetchUserPermissions() {
      if (!selectedUser) return

      setLoading(true)
      setError(null)

      try {
        const supabase = getSupabaseClient()

        // Foydalanuvchi ruxsatlarini olish
        const { data: userPerms, error: userPermError } = await supabase
          .from("user_permissions")
          .select("permission_id")
          .eq("user_id", selectedUser)

        if (userPermError) {
          console.error("Foydalanuvchi ruxsatlarini olishda xatolik:", userPermError)
          toast({
            title: "Xatolik",
            description: "Foydalanuvchi ruxsatlarini yuklashda xatolik yuz berdi",
            variant: "destructive",
          })
          setError("Foydalanuvchi ruxsatlarini yuklashda xatolik yuz berdi")
        } else {
          setUserPermissions(userPerms.map((p) => p.permission_id))
        }
      } catch (error) {
        console.error("Foydalanuvchi ruxsatlarini olishda xatolik:", error)
        setError("Foydalanuvchi ruxsatlarini yuklashda xatolik yuz berdi")
      } finally {
        setLoading(false)
      }
    }

    fetchUserPermissions()
  }, [selectedUser, refreshKey])

  // Rol tanlanganda uning ruxsatlarini olish
  useEffect(() => {
    async function fetchRolePermissions() {
      if (!selectedRole) return

      setLoading(true)
      setError(null)

      try {
        const rolePerms = await getRolePermissions(selectedRole)
        setRolePermissions(rolePerms.map((p) => p.id))
      } catch (error) {
        console.error("Rol ruxsatlarini olishda xatolik:", error)
        setError("Rol ruxsatlarini yuklashda xatolik yuz berdi")
      } finally {
        setLoading(false)
      }
    }

    fetchRolePermissions()
  }, [selectedRole, refreshKey])

  // Bo'limlarni olish
  useEffect(() => {
    async function fetchDepartments() {
      setError(null)

      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase.from("departments").select("id, name").order("name")

        if (error) throw error
        setDepartments(data || [])
      } catch (error) {
        console.error("Bo'limlarni olishda xatolik:", error)
        setError("Bo'limlarni yuklashda xatolik yuz berdi")
      }
    }

    fetchDepartments()
  }, [refreshKey])

  // Bo'lim ruxsatlarini olish
  useEffect(() => {
    async function fetchDepartmentPermissions() {
      if (!selectedUser || !selectedDepartment) return

      try {
        setLoading(true)
        setError(null)

        const supabase = getSupabaseClient()

        // Check if the department_permissions table exists
        const { data: tableExists, error: tableCheckError } = await supabase
          .from("department_permissions")
          .select("id")
          .limit(1)
          .maybeSingle()

        if (tableCheckError) {
          // If there's an error, check if it's because the table doesn't exist
          if (tableCheckError.message.includes("does not exist")) {
            console.warn("department_permissions table does not exist yet")
            setDepartmentPermissions([])
            return
          }
          throw tableCheckError
        }

        const { data, error } = await supabase
          .from("department_permissions")
          .select("permission_type")
          .eq("user_id", selectedUser)
          .eq("department_id", selectedDepartment)

        if (error) throw error

        setDepartmentPermissions(data.map((item) => item.permission_type))
      } catch (error) {
        console.error("Bo'lim ruxsatlarini olishda xatolik:", error)
        setError("Bo'lim ruxsatlarini yuklashda xatolik yuz berdi")
        setDepartmentPermissions([])
      } finally {
        setLoading(false)
      }
    }

    fetchDepartmentPermissions()
  }, [selectedUser, selectedDepartment, refreshKey])

  // Foydalanuvchi ruxsatini o'zgartirish
  const handleUserPermissionChange = async (permissionId: string, checked: boolean) => {
    if (!selectedUser) return

    setLoading(true)
    setError(null)

    try {
      // Get current user ID from multiple sources
      const currentUserId = currentUser?.id

      if (!currentUserId) {
        toast({
          title: "Xatolik",
          description: "Siz tizimga kirmagansiz",
          variant: "destructive",
        })
        setError("Siz tizimga kirmagansiz")
        setLoading(false)
        return
      }

      let success = false

      if (checked) {
        // Ruxsat qo'shish
        success = await addUserPermission(currentUserId, selectedUser, permissionId, ipAddress)
        if (success) {
          setUserPermissions((prev) => [...prev, permissionId])
        }
      } else {
        // Ruxsatni olib tashlash
        success = await removeUserPermission(currentUserId, selectedUser, permissionId, ipAddress)
        if (success) {
          setUserPermissions((prev) => prev.filter((id) => id !== permissionId))
        }
      }

      if (success) {
        toast({
          title: "Muvaffaqiyatli",
          description: checked ? "Ruxsat qo'shildi" : "Ruxsat olib tashlandi",
        })
      } else {
        toast({
          title: "Xatolik",
          description: "Ruxsatni o'zgartirishda xatolik yuz berdi",
          variant: "destructive",
        })
        setError("Ruxsatni o'zgartirishda xatolik yuz berdi")
      }
    } catch (error) {
      console.error("Ruxsatni o'zgartirishda xatolik:", error)
      toast({
        title: "Xatolik",
        description: "Ruxsatni o'zgartirishda xatolik yuz berdi",
        variant: "destructive",
      })
      setError("Ruxsatni o'zgartirishda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  // Rol ruxsatini o'zgartirish
  const handleRolePermissionChange = async (permissionId: string, checked: boolean) => {
    if (!selectedRole) return

    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()

      // Get current user ID from multiple sources
      const currentUserId = currentUser?.id

      if (!currentUserId) {
        toast({
          title: "Xatolik",
          description: "Siz tizimga kirmagansiz",
          variant: "destructive",
        })
        setError("Siz tizimga kirmagansiz")
        setLoading(false)
        return
      }

      if (checked) {
        // Ruxsat qo'shish
        await supabase.from("role_permissions").insert({
          role: selectedRole,
          permission_id: permissionId,
        })

        setRolePermissions((prev) => [...prev, permissionId])
      } else {
        // Ruxsatni olib tashlash
        await supabase.from("role_permissions").delete().eq("role", selectedRole).eq("permission_id", permissionId)

        setRolePermissions((prev) => prev.filter((id) => id !== permissionId))
      }

      // Admin faoliyatini qayd qilish
      const { data: permData } = await supabase.from("permissions").select("name").eq("id", permissionId).single()

      await logAdminActivity({
        user_id: currentUserId,
        action_type: checked ? "add_role_permission" : "remove_role_permission",
        action_details: {
          role: selectedRole,
          permission_name: permData?.name,
        },
        entity_type: "permission",
        entity_id: permissionId,
        ip_address: ipAddress,
      })

      toast({
        title: "Muvaffaqiyatli",
        description: checked
          ? `${selectedRole} roliga ruxsat qo'shildi`
          : `${selectedRole} rolidan ruxsat olib tashlandi`,
      })
    } catch (error) {
      console.error("Rol ruxsatini o'zgartirishda xatolik:", error)
      toast({
        title: "Xatolik",
        description: "Rol ruxsatini o'zgartirishda xatolik yuz berdi",
        variant: "destructive",
      })
      setError("Rol ruxsatini o'zgartirishda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  // Bo'lim ruxsatini o'zgartirish
  const handleDepartmentPermissionChange = async (
    permissionType: "view" | "issue" | "receive" | "manage",
    checked: boolean,
  ) => {
    if (!selectedUser || !selectedDepartment) return

    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()

      // Get current user ID from multiple sources
      const currentUserId = currentUser?.id

      if (!currentUserId) {
        toast({
          title: "Xatolik",
          description: "Siz tizimga kirmagansiz",
          variant: "destructive",
        })
        setError("Siz tizimga kirmagansiz")
        setLoading(false)
        return
      }

      if (checked) {
        // Ruxsat qo'shish
        await supabase.from("department_permissions").insert({
          user_id: selectedUser,
          department_id: selectedDepartment,
          permission_type: permissionType,
        })

        setDepartmentPermissions((prev) => [...prev, permissionType])

        // Log the activity
        await logAdminActivity({
          user_id: currentUserId,
          action_type: "add_department_permission",
          action_details: {
            user_id: selectedUser,
            department_id: selectedDepartment,
            permission_type: permissionType,
          },
          entity_type: "department_permission",
          entity_id: selectedDepartment,
          ip_address: ipAddress,
        })
      } else {
        // Ruxsatni olib tashlash
        await supabase
          .from("department_permissions")
          .delete()
          .eq("user_id", selectedUser)
          .eq("department_id", selectedDepartment)
          .eq("permission_type", permissionType)

        setDepartmentPermissions((prev) => prev.filter((p) => p !== permissionType))

        // Log the activity
        await logAdminActivity({
          user_id: currentUserId,
          action_type: "remove_department_permission",
          action_details: {
            user_id: selectedUser,
            department_id: selectedDepartment,
            permission_type: permissionType,
          },
          entity_type: "department_permission",
          entity_id: selectedDepartment,
          ip_address: ipAddress,
        })
      }

      toast({
        title: "Muvaffaqiyatli",
        description: checked ? "Bo'lim ruxsati qo'shildi" : "Bo'lim ruxsati olib tashlandi",
      })
    } catch (error) {
      console.error("Bo'lim ruxsatini o'zgartirishda xatolik:", error)
      toast({
        title: "Xatolik",
        description: "Bo'lim ruxsatini o'zgartirishda xatolik yuz berdi",
        variant: "destructive",
      })
      setError("Bo'lim ruxsatini o'zgartirishda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  // Ruxsatlarni filtrlash
  const filteredPermissions = permissions.filter(
    (permission) =>
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ruxsatlar boshqaruvi</CardTitle>
            <CardDescription>Foydalanuvchilar va rollar uchun ruxsatlarni boshqaring</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAuthState}
            disabled={loading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Yangilash
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Xatolik</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!currentUser?.id && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Diqqat!</AlertTitle>
              <AlertDescription>
                Tizimga kirmagansiz yoki sizning sessiyangiz eskirgan. "Yangilash" tugmasini bosib ko'ring yoki sahifani
                yangilang. Xatolik davom etsa, tizimdan chiqib, qaytadan kiring.
              </AlertDescription>
            </Alert>
          )}

          {currentUser?.id && (
            <Alert className="mb-4" variant="default">
              <User className="h-4 w-4" />
              <AlertTitle>Ma'lumot</AlertTitle>
              <AlertDescription>
                Siz <strong>{currentUser.email}</strong> sifatida tizimga kirgansiz. Rol:{" "}
                <strong>{currentUser.role}</strong>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="users">
            <TabsList className="mb-4">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Foydalanuvchilar
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Rollar
              </TabsTrigger>
              <TabsTrigger value="departments" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Bo'limlar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="user-select">Foydalanuvchini tanlang</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger id="user-select">
                      <SelectValue placeholder="Foydalanuvchini tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.email}{" "}
                          {user.role === "superadmin" ? "(SuperAdmin)" : user.role === "admin" ? "(Admin)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedUser && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="permission-search">Ruxsatlarni qidirish</Label>
                      <Input
                        id="permission-search"
                        placeholder="Ruxsat nomi yoki tavsifi bo'yicha qidirish..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className="border rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {loading ? (
                          Array(9)
                            .fill(0)
                            .map((_, i) => (
                              <div key={i} className="flex items-start space-x-2">
                                <Skeleton className="h-4 w-4 mt-1" />
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-48" />
                                </div>
                              </div>
                            ))
                        ) : filteredPermissions.length > 0 ? (
                          filteredPermissions.map((permission) => (
                            <div key={permission.id} className="flex items-start space-x-2">
                              <Checkbox
                                id={`user-perm-${permission.id}`}
                                checked={userPermissions.includes(permission.id)}
                                onCheckedChange={(checked) =>
                                  handleUserPermissionChange(permission.id, checked as boolean)
                                }
                              />
                              <div className="space-y-1">
                                <Label htmlFor={`user-perm-${permission.id}`} className="font-medium">
                                  {permission.name}
                                </Label>
                                <p className="text-sm text-muted-foreground">{permission.description}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-4 text-muted-foreground">
                            Ruxsatlar topilmadi
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="roles">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="role-select">Rolni tanlang</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger id="role-select">
                      <SelectValue placeholder="Rolni tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">SuperAdmin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="role-permission-search">Ruxsatlarni qidirish</Label>
                    <Input
                      id="role-permission-search"
                      placeholder="Ruxsat nomi yoki tavsifi bo'yicha qidirish..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="border rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                      {loading ? (
                        Array(9)
                          .fill(0)
                          .map((_, i) => (
                            <div key={i} className="flex items-start space-x-2">
                              <Skeleton className="h-4 w-4 mt-1" />
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-48" />
                              </div>
                            </div>
                          ))
                      ) : filteredPermissions.length > 0 ? (
                        filteredPermissions.map((permission) => (
                          <div key={permission.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={`role-perm-${permission.id}`}
                              checked={rolePermissions.includes(permission.id)}
                              onCheckedChange={(checked) =>
                                handleRolePermissionChange(permission.id, checked as boolean)
                              }
                              disabled={selectedRole === "superadmin"} // SuperAdmin roli uchun o'zgartirish mumkin emas
                            />
                            <div className="space-y-1">
                              <Label htmlFor={`role-perm-${permission.id}`} className="font-medium">
                                {permission.name}
                              </Label>
                              <p className="text-sm text-muted-foreground">{permission.description}</p>
                              {selectedRole === "superadmin" && (
                                <p className="text-xs text-orange-500">
                                  SuperAdmin roli barcha ruxsatlarga ega va o'zgartirib bo'lmaydi
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-4 text-muted-foreground">Ruxsatlar topilmadi</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="departments">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="user-select-dept">Foydalanuvchini tanlang</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger id="user-select-dept">
                        <SelectValue placeholder="Foydalanuvchini tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.email}{" "}
                            {user.role === "superadmin" ? "(SuperAdmin)" : user.role === "admin" ? "(Admin)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="department-select">Bo'limni tanlang</Label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger id="department-select">
                        <SelectValue placeholder="Bo'limni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedUser && selectedDepartment && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Bo'lim ruxsatlari</CardTitle>
                      <CardDescription>Foydalanuvchiga bo'lim bo'yicha ruxsatlarni bering</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="view-permission"
                            checked={departmentPermissions.includes("view")}
                            onCheckedChange={(checked) => {
                              handleDepartmentPermissionChange("view", checked as boolean)
                            }}
                          />
                          <Label htmlFor="view-permission" className="flex items-center">
                            <Eye className="mr-2 h-4 w-4 text-blue-500" />
                            Ko'rish ruxsati
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="issue-permission"
                            checked={departmentPermissions.includes("issue")}
                            onCheckedChange={(checked) => {
                              handleDepartmentPermissionChange("issue", checked as boolean)
                            }}
                          />
                          <Label htmlFor="issue-permission" className="flex items-center">
                            <Send className="mr-2 h-4 w-4 text-green-500" />
                            Berish ruxsati
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="receive-permission"
                            checked={departmentPermissions.includes("receive")}
                            onCheckedChange={(checked) => {
                              handleDepartmentPermissionChange("receive", checked as boolean)
                            }}
                          />
                          <Label htmlFor="receive-permission" className="flex items-center">
                            <ReceiptIcon className="mr-2 h-4 w-4 text-yellow-500" />
                            Qabul qilish ruxsati
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="manage-permission"
                            checked={departmentPermissions.includes("manage")}
                            onCheckedChange={(checked) => {
                              handleDepartmentPermissionChange("manage", checked as boolean)
                            }}
                          />
                          <Label htmlFor="manage-permission" className="flex items-center">
                            <Settings className="mr-2 h-4 w-4 text-red-500" />
                            Boshqarish ruxsati
                          </Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
