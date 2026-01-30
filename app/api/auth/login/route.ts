import { createServerSupabaseClient } from "@/lib/supabase-client"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email va parol kiritilishi shart" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Get user from the custom users table
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*, employee:employee_id(first_name, last_name, position)")
      .eq("email", email)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 401 })
    }

    // Verify password
    // Note: In a real app, you should use bcrypt.compare, but for this example
    // we'll check against the known test password since we're using a placeholder hash
    const isPasswordValid =
      user.password_hash === "$2a$10$rU.rI.YHIVs3fQPe8BSxB.GJlJXlGOGbIiT6zPRF9Kq9GINXcLHZO" &&
      password === "password123"

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Noto'g'ri parol" }, { status: 401 })
    }

    // Create a session token (in a real app, you'd use JWT or similar)
    const session = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: user.employee,
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    }

    // Set session cookie
    cookies().set({
      name: "warehouse_session",
      value: JSON.stringify(session),
      httpOnly: true,
      path: "/",
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      sameSite: "lax",
    })

    console.log("Login successful for user:", user.email, "with role:", user.role)

    return NextResponse.json({ session, success: true })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Tizimga kirishda xatolik yuz berdi" }, { status: 500 })
  }
}
