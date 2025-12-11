import { NextResponse } from "next/server"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabaseServer"

async function getLatestMatchForUser(userId: string) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from("matches")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1)

  if (error) throw error
  return data?.[0] ?? null
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const match = await getLatestMatchForUser(user.id)
    if (!match) {
      return NextResponse.json({ matchId: null, messages: [] })
    }

    const admin = createSupabaseAdminClient()
    const { data: messages, error: messagesError } = await admin
      .from("chat_messages")
      .select("id, match_id, sender_id, content, created_at")
      .eq("match_id", match.id)
      .order("created_at", { ascending: true })
      .limit(200)

    if (messagesError) {
      console.error("Chat messages fetch error:", messagesError)
      return NextResponse.json({ error: "Failed to load messages" }, { status: 500 })
    }

    return NextResponse.json({
      matchId: match.id,
      messages: messages || [],
      selfId: user.id,
    })
  } catch (error) {
    console.error("Chat GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const content = typeof body?.content === "string" ? body.content.trim() : ""

    if (!content) {
      return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 })
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: "Mesaj 1000 karakterden uzun olamaz" }, { status: 400 })
    }

    const match = await getLatestMatchForUser(user.id)
    if (!match) {
      return NextResponse.json({ error: "Önce bir eşleşme gerekiyor" }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()
    const { error: insertError } = await admin.from("chat_messages").insert({
      match_id: match.id,
      sender_id: user.id,
      content,
    })

    if (insertError) {
      console.error("Chat insert error:", insertError)
      return NextResponse.json({ error: "Mesaj gönderilemedi" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Chat POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
