import { NextResponse } from "next/server"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabaseServer"

const extractMemoryId = (request: Request, params?: { id?: string }) => {
  if (params?.id) return params.id
  const match = request.url.match(/memories\/([^/]+)\/like/i)
  return match?.[1] || null
}

export async function POST(request: Request, { params }: { params: { id?: string } }) {
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

    const { data: deleted, error: deleteError } = await admin
      .from("memory_likes")
      .delete()
      .eq("memory_id", memoryId)
      .eq("user_id", user.id)
      .select("id")

    if (deleteError) {
      console.error("Memory unlike error:", deleteError)
      return NextResponse.json({ error: "Failed to like memory" }, { status: 500 })
    }

    let liked = false

    if (!deleted || deleted.length === 0) {
      const { error: likeError } = await admin
        .from("memory_likes")
        .upsert({ memory_id: memoryId, user_id: user.id }, { onConflict: "memory_id,user_id" })

      if (likeError) {
        console.error("Memory like error:", likeError)
        return NextResponse.json({ error: "Failed to like memory" }, { status: 500 })
      }
      liked = true
    }

    const { count } = await admin
      .from("memory_likes")
      .select("id", { count: "exact", head: true })
      .eq("memory_id", memoryId)

    const likesCount = count || 0

    await admin.from("memories").update({ likes_count: likesCount }).eq("id", memoryId)

    return NextResponse.json({ liked, likes_count: likesCount })
  } catch (error) {
    console.error("Memory like toggle error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
