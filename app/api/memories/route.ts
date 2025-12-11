import { NextResponse } from "next/server"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabaseServer"

const getFirstName = (name?: string | null) => (name ? name.trim().split(/\s+/)[0] : "Anonim Santa")

const parseMeetingDateTime = (meeting_date?: string | null, meeting_start?: string | null): Date | null => {
  if (!meeting_date || !meeting_start) return null
  const start = meeting_start.length === 5 ? `${meeting_start}:00` : meeting_start
  const date = new Date(`${meeting_date}T${start}`)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")
    const limitParam = Number.parseInt(searchParams.get("limit") ?? "12", 10)
    const pageSize = Number.isNaN(limitParam) ? 12 : Math.min(Math.max(limitParam, 1), 50)

    let query = admin
      .from("memories")
      .select("id, user_id, image_url, caption, created_at, likes_count")
      .order("created_at", { ascending: false })
      .limit(pageSize + 1)

    if (cursor) {
      query = query.lt("created_at", cursor)
    }

    const { data: memories, error: memoriesError } = await query

    if (memoriesError) {
      console.error("Memories fetch error:", memoriesError)
      return NextResponse.json({ error: "Failed to load memories" }, { status: 500 })
    }

    const hasMore = (memories?.length || 0) > pageSize
    const pageItems = hasMore ? (memories || []).slice(0, pageSize) : memories || []
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.created_at || null : null

    const userIds = Array.from(new Set(pageItems.map((m) => m.user_id)))
    const profileMap = new Map<string, string>()

    if (userIds.length > 0) {
      const { data: profiles } = await admin.from("profiles").select("user_id, name").in("user_id", userIds)
      profiles?.forEach((p) => {
        profileMap.set((p as { user_id: string }).user_id, getFirstName((p as { name?: string | null }).name))
      })
    }

    const ids = pageItems.map((m) => m.id)
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
      pageItems.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        image_url: m.image_url,
        caption: m.caption,
        created_at: m.created_at,
        likes_count: m.likes_count || 0,
        user_name: getFirstName(profileMap.get(m.user_id) || "Anonim Santa"),
        liked_by_me: likedIds.includes(m.id),
      })) || []

    return NextResponse.json({ items, nextCursor })
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

    const admin = createSupabaseAdminClient()

    // Fetch latest match for the user
    const { data: matches, error: matchError } = await admin
      .from("matches")
      .select("*")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(1)

    if (matchError) {
      console.error("Match fetch error:", matchError)
      return NextResponse.json({ error: "Match bilgisi alınamadı" }, { status: 500 })
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ error: "Önce bir eşleşmen olmalı" }, { status: 400 })
    }

    const match = matches[0]
    const otherUserId = match.user_a === user.id ? match.user_b : match.user_a
    const meetingDateTime = parseMeetingDateTime(match.meeting_date, match.meeting_start)

    if (!meetingDateTime) {
      return NextResponse.json({ error: "Buluşma bilgisi eksik" }, { status: 400 })
    }

    if (Date.now() < meetingDateTime.getTime()) {
      return NextResponse.json({ error: "Fotoğraf yükleme buluşma sonrasında açılır" }, { status: 403 })
    }

    // Ensure pair has only one memory
    const { data: existingMemory, error: existingError } = await admin
      .from("memories")
      .select("id")
      .in("user_id", [user.id, otherUserId])
      .limit(1)

    if (existingError) {
      console.error("Memory existing check error:", existingError)
      return NextResponse.json({ error: "Kontrol sırasında hata oluştu" }, { status: 500 })
    }

    if (existingMemory && existingMemory.length > 0) {
      return NextResponse.json({ error: "Eşleşmeniz için zaten bir fotoğraf var" }, { status: 409 })
    }

    const body = await request.json().catch(() => null)
    const imageUrl = body?.imageUrl as string | undefined
    const caption = body?.caption as string | undefined

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    const { data, error } = await admin
      .from("memories")
      .insert({
        user_id: user.id,
        image_url: imageUrl,
        caption: caption ? caption.slice(0, 200) : null,
      })
      .select("id, user_id, image_url, caption, created_at, likes_count")
      .single()

    if (error || !data) {
      console.error("Memory insert error:", error)
      return NextResponse.json({ error: "Failed to save memory" }, { status: 500 })
    }

    const { data: profile } = await admin.from("profiles").select("name").eq("user_id", user.id).single()

    return NextResponse.json({
      item: {
        ...data,
        user_name: getFirstName(profile?.name || "Anonim Santa"),
        liked_by_me: false,
      },
    })
  } catch (error) {
    console.error("Memories POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
