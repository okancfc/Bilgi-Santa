import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  console.log("🔗 Auth callback çağrıldı")
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/profile"

  console.log("📋 Callback parametreleri:", { token_hash: !!token_hash, code: !!code, type, next })

  const cookieStore = cookies()
  const loginUrl = new URL("/login", request.url)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch (e) {
            console.error("⚠️ Cookie set hatası:", e)
          }
        },
      },
    },
  )

  // New-style Supabase links send a `code` that must be exchanged for a session
  if (code) {
    console.log("✅ Code parametresi bulundu, session exchange başlatılıyor...")
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    console.log("📥 exchangeCodeForSession yanıtı:", { error: error?.message })

    if (!error) {
      console.log("✅ Code exchange başarılı, login sayfasına yönlendiriliyor...")
      // Session oluşsa bile kullanıcıya tekrar giriş yaptırmak için logout ediyoruz
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        console.error("⚠️ signOut sırasında hata:", signOutError.message)
      }

      loginUrl.searchParams.set("verified", "true")
      return NextResponse.redirect(loginUrl)
    } else {
      console.error("❌ Code exchange hatası:", error)
    }
  }

  // Fallback for older email links using token_hash/type
  if (token_hash && type) {
    console.log("✅ Token hash ve type var, doğrulama yapılıyor...")

    console.log("📤 verifyOtp çağrılıyor...")
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    console.log("📥 verifyOtp yanıtı:", { error: error?.message })

    if (!error) {
      console.log("✅ Email doğrulama başarılı, login sayfasına yönlendiriliyor")
      loginUrl.searchParams.set("verified", "true")
      return NextResponse.redirect(loginUrl)
    } else {
      console.error("❌ Email doğrulama hatası:", error)
    }
  } else {
    console.log("❌ Token hash veya type eksik!")
  }

  // Return the user to an error page with instructions
  console.log("🔄 Login'e hata ile yönlendiriliyor")
  loginUrl.searchParams.set("error", "confirmation_failed")
  return NextResponse.redirect(loginUrl)
}
