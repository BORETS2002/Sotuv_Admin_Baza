import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Middleware funksiyasi
export function middleware(req: NextRequest) {
  // API yo'llarini middleware tekshiruvidan chiqarib tashlash
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Login sahifasini tekshirish
  if (req.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.next()
  }

  // Boshqa barcha sahifalar uchun, faqat dashboard sahifalariga kirish uchun tekshirish
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    // Bu yerda hech qanday tekshirish qilmaymiz, chunki login sahifasida localStorage ishlatamiz
    return NextResponse.next()
  }

  // Root path uchun, to'g'ridan-to'g'ri next() qaytaramiz, redirect qilmaymiz
  if (req.nextUrl.pathname === "/") {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}
