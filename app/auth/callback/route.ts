import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  console.log("🔗 Auth callback çağrıldı")
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/profile"

  console.log("📋 Callback parametreleri:", { token_hash: !!token_hash, type, next })

  if (token_hash && type) {
    console.log("✅ Token hash ve type var, doğrulama yapılıyor...")
    const cookieStore = await cookies()
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

    console.log("📤 verifyOtp çağrılıyor...")
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    console.log("📥 verifyOtp yanıtı:", { error: error?.message })

    if (!error) {
      console.log("✅ Email doğrulama başarılı, yönlendiriliyor:", next)
      return NextResponse.redirect(new URL(next, request.url))
    } else {
      console.error("❌ Email doğrulama hatası:", error)
    }
  } else {
    console.log("❌ Token hash veya type eksik!")
  }

  // Return the user to an error page with instructions
  console.log("🔄 Login'e hata ile yönlendiriliyor")
  return NextResponse.redirect(new URL("/login?error=confirmation_failed", request.url))
}
