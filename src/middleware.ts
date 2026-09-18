import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

// Add routes that don't require authentication
const publicRoutes = ["/login", "/api/auth"]

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { nextUrl } = req

  const isPublicRoute = publicRoutes.some((route) => nextUrl.pathname.startsWith(route))

  if (isPublicRoute) {
    if (isLoggedIn && nextUrl.pathname === "/login") {
      // If logged in and trying to access login page, redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    // Redirect unauthenticated users to login page
    let from = nextUrl.pathname
    if (nextUrl.search) {
      from += nextUrl.search
    }
    return NextResponse.redirect(
      new URL(`/login?from=${encodeURIComponent(from)}`, nextUrl)
    )
  }

  const role = (req.auth as any)?.user?.role;

  // Basic Role-based routing (Expand as needed)
  if (nextUrl.pathname.startsWith("/admin") && role !== "MASTER_ADMIN" && role !== "SUPER_ADMIN" && role !== "ADMIN_STAFF") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  if (nextUrl.pathname.startsWith("/teacher") && role !== "TEACHER" && role !== "MASTER_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
})

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images).*)"],
}
