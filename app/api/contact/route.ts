import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabaseServer"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, message } = body

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Use admin client to insert (bypasses RLS)
    const supabase = createSupabaseAdminClient()

    const { error } = await supabase.from("contact_messages").insert({
      name,
      email,
      message,
      is_read: false,
    })

    if (error) {
      console.error("Error saving contact message:", error)
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Contact API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
