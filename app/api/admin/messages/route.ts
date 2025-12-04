import { NextResponse } from "next/server"
import { ADMIN_EMAILS } from "@/lib/constants"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabaseServer"

async function ensureAdmin() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  if (!ADMIN_EMAILS.includes(user.email || "")) {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { user, response: null }
}

export async function GET() {
  const { response } = await ensureAdmin()
  if (response) return response

  try {
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Admin messages fetch error:", error)
      return NextResponse.json({ error: "Failed to load messages" }, { status: 500 })
    }

    return NextResponse.json({ messages: data || [] })
  } catch (error) {
    console.error("Admin messages GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const { response } = await ensureAdmin()
  if (response) return response

  try {
    const { id, is_read } = (await request.json()) as { id?: string; is_read?: boolean }
    if (!id) {
      return NextResponse.json({ error: "Missing message id" }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()
    const { error } = await admin.from("contact_messages").update({ is_read: is_read ?? true }).eq("id", id)

    if (error) {
      console.error("Admin messages update error:", error)
      return NextResponse.json({ error: "Failed to update message" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin messages PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
