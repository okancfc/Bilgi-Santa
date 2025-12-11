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

    const adminClient = createSupabaseAdminClient()

    // Fetch latest match for the user
    const { data: matches, error: matchError } = await adminClient
      .from("matches")
      .select("*")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(1)

    if (matchError) {
      console.error("Match fetch error:", matchError)
      return NextResponse.json({ error: "Failed to load match" }, { status: 500 })
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ match: null, otherProfile: null })
    }

    const match = matches[0]
    const otherUserId = match.user_a === user.id ? match.user_b : match.user_a

    const { data: otherProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("user_id", otherUserId)
      .single()

    if (profileError) {
      console.error("Other profile fetch error:", profileError)
      return NextResponse.json({ error: "Failed to load matched profile" }, { status: 500 })
    }

    const sanitizedProfile = otherProfile
      ? { ...otherProfile, email: null, name: null }
      : null

    return NextResponse.json({ match, otherProfile: sanitizedProfile })
  } catch (error) {
    console.error("Match API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
