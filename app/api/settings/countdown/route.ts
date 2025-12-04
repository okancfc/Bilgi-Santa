import { NextResponse } from "next/server"
import { ADMIN_EMAILS } from "@/lib/constants"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabaseServer"
import { TARGET_DATE } from "@/lib/constants"

type CountdownSettings = {
  start_at: string | null
  enabled: boolean
}

const fallbackSettings: CountdownSettings = {
  start_at: TARGET_DATE.toISOString(),
  enabled: true,
}

function buildResponse(settings?: Partial<CountdownSettings>) {
  return NextResponse.json({
    settings: {
      start_at: settings?.start_at ?? fallbackSettings.start_at,
      enabled: settings?.enabled ?? fallbackSettings.enabled,
    },
  })
}

export async function GET() {
  try {
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin.from("app_settings").select("value").eq("key", "countdown").maybeSingle()

    if (error) {
      console.warn("Countdown settings fetch error (falling back):", error.message)
      return buildResponse()
    }

    const value = (data?.value as Partial<CountdownSettings>) || {}
    return buildResponse(value)
  } catch (error) {
    console.error("Countdown settings GET error:", error)
    return buildResponse()
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

    if (!ADMIN_EMAILS.includes(user.email || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json()) as Partial<CountdownSettings>

    const admin = createSupabaseAdminClient()
    const { error } = await admin.from("app_settings").upsert(
      {
        key: "countdown",
        value: {
          start_at: body.start_at ?? fallbackSettings.start_at,
          enabled: typeof body.enabled === "boolean" ? body.enabled : fallbackSettings.enabled,
        },
      },
      { onConflict: "key" },
    )

    if (error) {
      console.error("Countdown settings save error:", error)
      return NextResponse.json({ error: error.message || "Failed to save settings" }, { status: 500 })
    }

    return buildResponse(body)
  } catch (error) {
    console.error("Countdown settings POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
