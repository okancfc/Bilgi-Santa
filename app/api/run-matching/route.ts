import { NextResponse } from "next/server"
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabaseServer"
import { runMatching } from "@/lib/matching"
import { ADMIN_EMAILS } from "@/lib/constants"

export async function POST() {
  try {
    // Check if user is authenticated and is an admin
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user email is in admin list
    if (!ADMIN_EMAILS.includes(user.email || "")) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    // Use admin client for matching (bypasses RLS)
    const adminClient = createSupabaseAdminClient()

    // Run the matching algorithm
    const { matches, summary } = await runMatching(adminClient)

    if (matches.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No matches could be created",
        summary,
        matchesCreated: 0,
      })
    }

    // Insert all matches into the database
    const { error } = await adminClient.from("matches").insert(matches)

    if (error) {
      console.error("Error inserting matches:", error)
      return NextResponse.json({ error: "Failed to save matches" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      summary,
      matchesCreated: matches.length,
    })
  } catch (error) {
    console.error("Matching API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
