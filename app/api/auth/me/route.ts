import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    // Get session from cookie
    const sessionCookie = cookies().get("warehouse_session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Parse session
    const session = JSON.parse(sessionCookie)

    return NextResponse.json({ user: session.user })
  } catch (error) {
    console.error("Error getting user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
