"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, User, Calendar, MapPin, FileText, Database } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

type AdminActivity = {
  id: string
  user_id: string
  action_type: string
  action_details: any
  entity_type: string | null
  entity_id: string | null
  ip_address: string
  created_at: string
  user: {
    email: string
    full_name: string | null
    employee: {
      first_name: string
      last_name: string
      position: string
    } | null
  } | null
}

export default function AdminActivityDetailPage({ params }: { params: { id: string } }) {
  const [activity, setActivity] = useState<AdminActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchActivityDetails() {
      setLoading(true)
      try {
        const supabase = getSupabaseClient()

        const { data, error: fetchError } = await supabase
          .from("admin_activities")
          .select(`
            id,
            user_id,
            action_type,
            action_details,
            entity_type,
            entity_id,
            ip_address,
            created_at,
            users!user_id(
              email, 
              full_name,
              employee:employee_id(
                first_name,
                last_name,
                position
              )
            )
          `)
          .eq("id", params.id)
          .single()

        if (fetchError) {
          throw fetchError
        }

        // Transform the data to match the expected structure
        const transformedData = {
          ...data,
          user: data.users,
        }

        setActivity(transformedData as AdminActivity)
      } catch (error: any) {
        console.error("Error fetching activity details:", error)
        setError(error.message || "Faoliyat ma'lumotlarini yuklashda xatolik yuz berdi")
      } finally {
        setLoading(false)
      }
    }

    fetchActivityDetails()
  }, [params.id])

  // Function to get badge color based on action type
  const getActionBadgeColor = (actionType: string) => {
    if (actionType.startsWith("create")) return "bg-green-100 text-green-800"
    if (actionType.startsWith("update")) return "bg-blue-100 text-blue-800"
    if (actionType.startsWith("delete")) return "bg-red-100 text-red-800"
    if (actionType === "login") return "bg-purple-100 text-purple-800"
    if (actionType === "logout") return "bg-gray-100 text-gray-800"
    if (actionType.includes("issue")) return "bg-yellow-100 text-yellow-800"
    if (actionType.includes("receive")) return "bg-indigo-100 text-indigo-800"
    return "bg-gray-100 text-gray-800"
  }

  // Function to get icon based on entity type
  const getEntityIcon = (entityType: string | null) => {
    switch (entityType) {
      case "user":
        return <User className="h-5 w-5" />
      case "item":
        return <Database className="h-5 w-5" />
      case "transaction":
        return <FileText className="h-5 w-5" />
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto py-6">
      <Button variant="ghost" className="mb-4 flex items-center gap-2" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        Orqaga
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Admin faoliyati tafsilotlari</CardTitle>
          <CardDescription>ID: {params.id}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Xatolik</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : activity ? (
            <div className="space-y-6">
              {/* Header info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <Badge className={cn("text-sm font-normal", getActionBadgeColor(activity.action_type))}>
                    {activity.action_type}
                  </Badge>
                  {activity.entity_type && (
                    <span className="ml-2 text-sm text-muted-foreground">{activity.entity_type}</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(activity.created_at).toLocaleString()}
                </div>
              </div>

              {/* User info */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Admin ma'lumotlari
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div>{activity.user?.email || "Noma'lum"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">To'liq ism</div>
                    <div>
                      {activity.user?.employee
                        ? `${activity.user.employee.first_name} ${activity.user.employee.last_name}`
                        : activity.user?.full_name || "Noma'lum"}
                    </div>
                  </div>
                </div>
              </div>

              {/* IP Address */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  IP manzil
                </h3>
                <div>{activity.ip_address}</div>
              </div>

              {/* Entity info */}
              {activity.entity_type && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    {getEntityIcon(activity.entity_type)}
                    Obyekt ma'lumotlari
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Turi</div>
                      <div>{activity.entity_type}</div>
                    </div>
                    {activity.entity_id && (
                      <div>
                        <div className="text-sm text-muted-foreground">ID</div>
                        <div className="font-mono text-xs">{activity.entity_id}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action details */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Harakat tafsilotlari
                </h3>
                <pre className="bg-background p-4 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(activity.action_details, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">Faoliyat topilmadi</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
