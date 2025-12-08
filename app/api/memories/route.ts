import { NextResponse } from "next/server"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabaseServer"

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createSupabaseAdminClient()

    const { data: memories, error: memoriesError } = await admin
      .from("memories")
      .select("id, user_id, image_url, caption, created_at, likes_count")
      .order("created_at", { ascending: false })
      .limit(50)

    if (memoriesError) {
      console.error("Memories fetch error:", memoriesError)
      return NextResponse.json({ error: "Failed to load memories" }, { status: 500 })
    }

    const userIds = Array.from(new Set((memories || []).map((m) => m.user_id)))
    const profileMap = new Map<string, string>()

    if (userIds.length > 0) {
      const { data: profiles } = await admin.from("profiles").select("user_id, name").in("user_id", userIds)
      profiles?.forEach((p) => {
        profileMap.set((p as { user_id: string }).user_id, (p as { name?: string | null }).name || "Anonim Santa")
      })
    }

    const ids = memories?.map((m) => m.id) || []
    let likedIds: string[] = []

    if (ids.length > 0) {
      const { data: likes } = await admin
        .from("memory_likes")
        .select("memory_id")
        .eq("user_id", user.id)
        .in("memory_id", ids)

      likedIds = likes?.map((l) => l.memory_id) || []
    }

    const items =
      memories?.map((m) => ({
        id: m.id,
        image_url: m.image_url,
        caption: m.caption,
        created_at: m.created_at,
        likes_count: m.likes_count || 0,
        user_name: profileMap.get(m.user_id) || "Anonim Santa",
        liked_by_me: likedIds.includes(m.id),
      })) || []

    return NextResponse.json({ items })
  } catch (error) {
    console.error("Memories GET error:", error)
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

    const body = await request.json().catch(() => null)
    const imageUrl = body?.imageUrl as string | undefined
    const caption = body?.caption as string | undefined

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()

    const { data, error } = await admin
      .from("memories")
      .insert({
        user_id: user.id,
        image_url: imageUrl,
        caption: caption ? caption.slice(0, 200) : null,
      })
      .select("id, image_url, caption, created_at, likes_count")
      .single()

    if (error || !data) {
      console.error("Memory insert error:", error)
      return NextResponse.json({ error: "Failed to save memory" }, { status: 500 })
    }

    const { data: profile } = await admin.from("profiles").select("name").eq("user_id", user.id).single()

    return NextResponse.json({
      item: {
        ...data,
        user_name: profile?.name || "Anonim Santa",
        liked_by_me: false,
      },
    })
  } catch (error) {
    console.error("Memories POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
