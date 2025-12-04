import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  console.log("🛡️ Middleware çalışıyor:", request.nextUrl.pathname)
  
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Refresh session if expired
  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      // AuthSessionMissingError is normal for logged out users
      if (!error.message?.includes("Auth session missing")) {
        console.error("⚠️ Middleware auth error:", error.message)
      }
    } else {
      user = data.user
      console.log("✅ Middleware: Kullanıcı authenticated:", user?.email)
    }
  } catch (error) {
    console.error("💥 Middleware exception:", error)
  }

  // Protected routes
  const protectedPaths = ["/profile", "/availability", "/match", "/admin"]
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  // Auth routes (don't redirect - let users access login/signup pages)
  const authPaths = ["/login", "/signup"]
  const isAuthPath = authPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  // Only redirect if trying to access protected path without auth
  if (isProtectedPath && !user) {
    console.log("🚫 Protected route, kullanıcı yok, login'e yönlendiriliyor")
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // If user is logged in and on auth page, redirect to profile
  // BUT: Only do this for GET requests, not POST (form submissions)
  if (isAuthPath && user && request.method === "GET") {
    console.log("👤 Kullanıcı zaten giriş yapmış, profile'a yönlendiriliyor")
    const url = request.nextUrl.clone()
    url.pathname = "/profile"
    return NextResponse.redirect(url)
  }

  console.log("✅ Middleware: İstek devam ediyor")
  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
