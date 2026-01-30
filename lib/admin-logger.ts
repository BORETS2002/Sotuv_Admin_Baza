import { getSupabaseClient } from "@/lib/supabase-client"

export type AdminAction =
  | "login"
  | "logout"
  | "create_user"
  | "update_user"
  | "delete_user"
  | "create_item"
  | "update_item"
  | "delete_item"
  | "issue_item"
  | "receive_item"
  | "create_category"
  | "update_category"
  | "delete_category"
  | "create_department"
  | "update_department"
  | "delete_department"
  | "create_employee"
  | "update_employee"
  | "delete_employee"
  | "create_report"
  | "approve_report"
  | "reject_report"

export type EntityType = "user" | "item" | "category" | "department" | "employee" | "transaction" | "report"

export interface LogAdminActivityParams {
  userId: string
  actionType: AdminAction
  actionDetails: Record<string, any>
  entityType?: EntityType
  entityId?: string
  ipAddress?: string
}

// UUID yaratish uchun funksiya
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Modify the logAdminActivity function to handle errors gracefully
export async function logAdminActivity({
  userId,
  actionType,
  actionDetails,
  entityType,
  entityId,
  ipAddress,
}: LogAdminActivityParams) {
  try {
    // Check if we're in development/preview mode
    const isDevelopment = process.env.NODE_ENV === "development" || !process.env.NEXT_PUBLIC_SUPABASE_URL

    const supabase = getSupabaseClient()

    // Ensure we have a valid userId
    if (!userId) {
      console.error("Admin faoliyatini qayd qilishda xatolik: userId ko'rsatilmagan")
      return
    }

    // Skip database check in development mode
    if (!isDevelopment) {
      try {
        // First check if the user exists in the database
        const { data: userData, error: userError } = await supabase.from("users").select("id").eq("id", userId).single()

        if (userError) {
          console.error("Admin faoliyatini qayd qilishda xatolik: foydalanuvchi topilmadi", userError)
          // Continue with logging even if user check fails
        }
      } catch (checkError) {
        console.error("User check failed but continuing with logging:", checkError)
        // Continue with logging even if user check fails
      }
    }

    // UUID formatidagi ID yaratish
    const activityId = generateUUID()

    // entityId uchun UUID yaratish (agar berilgan bo'lsa)
    const formattedEntityId = entityId || null

    // In development mode, just log to console instead of database
    if (isDevelopment) {
      console.log("Admin activity (dev mode):", {
        id: activityId,
        user_id: userId,
        action_type: actionType,
        action_details: actionDetails || {},
        entity_type: entityType,
        entity_id: formattedEntityId,
        ip_address: ipAddress || "unknown",
      })
      return
    }

    // Try to insert the activity record
    try {
      const { error } = await supabase.from("admin_activities").insert({
        id: activityId,
        user_id: userId,
        action_type: actionType,
        action_details: actionDetails || {},
        entity_type: entityType,
        entity_id: formattedEntityId,
        ip_address: ipAddress || "unknown",
      })

      if (error) {
        console.error("Admin faoliyatini qayd qilishda xatolik:", error)
      }
    } catch (insertError) {
      console.error("Failed to insert admin activity:", insertError)
    }
  } catch (error) {
    console.error("Admin faoliyatini qayd qilishda xatolik:", error)
    // Don't throw the error further to prevent breaking the app
  }
}

// Enhance the logAdminLogin function to store login time for session duration calculation
export async function logAdminLogin(userId: string, email: string, ipAddress?: string) {
  return logAdminActivity({
    userId,
    actionType: "login",
    actionDetails: {
      email,
      login_time: new Date().toISOString(), // Store login time for session duration calculation
    },
    entityType: "user",
    entityId: userId,
    ipAddress,
  })
}

// Enhance the logAdminLogout function to include login time reference
export async function logAdminLogout(userId: string, email: string, loginTime?: string, ipAddress?: string) {
  return logAdminActivity({
    userId,
    actionType: "logout",
    actionDetails: {
      email,
      login_time: loginTime || null, // Reference to when the user logged in
    },
    entityType: "user",
    entityId: userId,
    ipAddress,
  })
}

// Mahsulot operatsiyalarini qayd qilish uchun maxsus funksiyalar
export async function logItemIssue(
  adminId: string,
  itemId: string,
  employeeId: string,
  itemName: string,
  employeeName: string,
  ipAddress?: string,
) {
  return logAdminActivity({
    userId: adminId,
    actionType: "issue_item",
    actionDetails: {
      item_id: itemId,
      item_name: itemName,
      employee_id: employeeId,
      employee_name: employeeName,
    },
    entityType: "transaction",
    // entityId UUID bo'lishi kerak, shuning uchun yangi UUID yaratamiz
    entityId: generateUUID(),
    ipAddress,
  })
}

export async function logItemReceive(
  adminId: string,
  itemId: string,
  employeeId: string,
  itemName: string,
  employeeName: string,
  ipAddress?: string,
) {
  return logAdminActivity({
    userId: adminId,
    actionType: "receive_item",
    actionDetails: {
      item_id: itemId,
      item_name: itemName,
      employee_id: employeeId,
      employee_name: employeeName,
    },
    entityType: "transaction",
    // entityId UUID bo'lishi kerak, shuning uchun yangi UUID yaratamiz
    entityId: generateUUID(),
    ipAddress,
  })
}
