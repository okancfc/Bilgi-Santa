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
    const [profilesRes, slotsRes, matchesRes] = await Promise.all([
      admin
        .from("profiles")
        .select("user_id, name, email, department, gender, class_year, is_active, profile_completed, created_at"),
      admin.from("availability_slots").select("user_id, campus, location"),
      admin.from("matches").select("user_a, user_b"),
    ])

    if (profilesRes.error || slotsRes.error || matchesRes.error) {
      console.error("Admin stats fetch error:", profilesRes.error || slotsRes.error || matchesRes.error)
      return NextResponse.json({ error: "Failed to load stats" }, { status: 500 })
    }

    const profiles = profilesRes.data || []
    const slots = slotsRes.data || []
    const matches = matchesRes.data || []

    const slotUsers = new Set((slots || []).map((s) => s.user_id))
    const matchedUsers = new Set<string>()
    matches.forEach((m) => {
      matchedUsers.add(m.user_a)
      matchedUsers.add(m.user_b)
    })

    const totalUsers = profiles.length
    const activeUsers = profiles.filter((p) => p.is_active).length
    const completedProfiles = profiles.filter((p) => p.profile_completed).length
    const usersWithSlots = slotUsers.size

    const readyUsers = new Set(
      profiles.filter((p) => p.profile_completed && p.is_active && slotUsers.has(p.user_id)).map((p) => p.user_id),
    )
    const readyAndMatched = Array.from(readyUsers).filter((id) => matchedUsers.has(id)).length
    const readyButUnmatched = Math.max(readyUsers.size - readyAndMatched, 0)

    const totals = {
      totalUsers,
      activeUsers,
      completedProfiles,
      usersWithSlots,
      slotsCount: slots.length,
      matches: matches.length,
      matchedUsers: matchedUsers.size,
      readyForMatch: readyUsers.size,
    }

    const rates = {
      completion: totalUsers ? Math.round((completedProfiles / totalUsers) * 100) : 0,
      readiness: totalUsers ? Math.round((readyUsers.size / totalUsers) * 100) : 0,
      matchCoverage: readyUsers.size ? Math.round((readyAndMatched / readyUsers.size) * 100) : 0,
      activeRate: totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0,
    }

    const gender: Record<string, number> = { kiz: 0, erkek: 0, unknown: 0 }
    const classYears: Record<string, number> = {}
    const deptCounts: Record<string, number> = {}
    profiles.forEach((p) => {
      const genderKey = p.gender || "unknown"
      gender[genderKey] = (gender[genderKey] || 0) + 1

      const classKey = p.class_year ? `${p.class_year}` : "Belirtilmemiş"
      classYears[classKey] = (classYears[classKey] || 0) + 1

      const deptKey = p.department?.trim() || "Belirtilmemiş"
      deptCounts[deptKey] = (deptCounts[deptKey] || 0) + 1
    })

    const locationCounts: Record<string, number> = {}
    slots.forEach((slot) => {
      const locationKey = slot.location?.trim() || slot.campus || "Belirtilmemiş"
      locationCounts[locationKey] = (locationCounts[locationKey] || 0) + 1
    })

    const toArray = (record: Record<string, number>, limit?: number) => {
      const arr = Object.entries(record)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }))
      return typeof limit === "number" ? arr.slice(0, limit) : arr
    }

    const recentProfiles = [...profiles]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)
      .map((p) => ({
        id: p.user_id,
        name: p.name,
        email: p.email,
        created_at: p.created_at,
        profile_completed: p.profile_completed,
        has_slots: slotUsers.has(p.user_id),
      }))

    return NextResponse.json({
      stats: {
        totals,
        rates,
        breakdowns: {
          gender,
          classYears,
          departments: toArray(deptCounts, 6),
          locations: toArray(locationCounts, 8),
        },
        readinessGaps: {
          missingSlots: Math.max(completedProfiles - readyUsers.size, 0),
          incompleteProfiles: Math.max(totalUsers - completedProfiles, 0),
          readyButUnmatched,
        },
        recentProfiles,
      },
    })
  } catch (error) {
    console.error("Admin stats GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
