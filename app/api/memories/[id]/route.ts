import { NextResponse } from "next/server"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabaseServer"

const extractMemoryId = (request: Request, params?: { id?: string }) => {
  if (params?.id) return params.id
  const match = request.url.match(/memories\/([^/]+)$/i)
  return match?.[1] || null
}

export async function DELETE(request: Request, { params }: { params: { id?: string } }) {
  const memoryId = extractMemoryId(request, params)
  if (!memoryId) {
    return NextResponse.json({ error: "Memory id missing" }, { status: 400 })
  }

  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createSupabaseAdminClient()

    const { data: memory, error: memoryError } = await admin
      .from("memories")
      .select("id, user_id, image_url")
      .eq("id", memoryId)
      .single()

    if (memoryError || !memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 })
    }

    // Only allow the owner or the current match partner to delete.
    const isOwner = memory.user_id === user.id
    let isPartner = false

    if (!isOwner) {
      const { data: pairMatch } = await admin
        .from("matches")
        .select("id")
        .or(`and(user_a.eq.${user.id},user_b.eq.${memory.user_id}),and(user_b.eq.${user.id},user_a.eq.${memory.user_id})`)
        .order("created_at", { ascending: false })
        .limit(1)

      isPartner = Boolean(pairMatch && pairMatch.length > 0)
    }

    if (!isOwner && !isPartner) {
      return NextResponse.json({ error: "Bu fotoğrafı silemezsin" }, { status: 403 })
    }

    // Remove likes first to keep counts consistent
    await admin.from("memory_likes").delete().eq("memory_id", memoryId)

    const { error: deleteError } = await admin.from("memories").delete().eq("id", memoryId)
    if (deleteError) {
      console.error("Memory delete error:", deleteError)
      return NextResponse.json({ error: "Fotoğraf silinemedi" }, { status: 500 })
    }

    // Best-effort storage cleanup if we can infer the path
    try {
      const url = new URL(memory.image_url)
      const matchPath = url.pathname.match(/memories\/(.+)$/)
      const storagePath = matchPath?.[1]
      if (storagePath) {
        await admin.storage.from("memories").remove([storagePath])
      }
    } catch (err) {
      console.warn("Memory storage cleanup skipped:", err)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Memory DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
