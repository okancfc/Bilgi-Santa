import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  console.log("🔐 Server-side login API çağrıldı")
  
  try {
    const { email, password } = await request.json()
    console.log("📧 Email:", email)

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
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
                console.log("🍪 Cookie set edildi:", name)
              })
            } catch (e) {
              console.error("⚠️ Cookie set hatası:", e)
            }
          },
        },
      },
    )

    console.log("📤 Supabase signIn çağrılıyor...")
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("❌ Login hatası:", error.message)
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.log("✅ Login başarılı:", data.user?.email)

    // Check profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_completed")
      .eq("user_id", data.user.id)
      .maybeSingle()

    console.log("📋 Profile completed:", profile?.profile_completed)

    return NextResponse.json({
      success: true,
      user: data.user,
      profile_completed: profile?.profile_completed || false,
    })
  } catch (error) {
    console.error("💥 Server login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
