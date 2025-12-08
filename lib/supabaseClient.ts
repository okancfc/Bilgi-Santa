import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client (singleton pattern)
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (!supabaseInstance) {
    // Use cookie-based storage so sessions set on the server are available in the browser
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseInstance
}

// For direct import convenience
export const supabase = getSupabaseClient()

// Types for database tables
export interface Profile {
  id: string
  user_id: string
  name: string | null
  email: string | null
  department: string | null
  class_year: number | null
  interests: string[]
  gift_preferences: string | null
  favorite_things: string[]
  about_me: string | null
  is_active: boolean
  profile_completed: boolean
  created_at: string
  updated_at: string
}

export interface AvailabilitySlot {
  id: string
  user_id: string
  slot_date: string
  start_time: string
  end_time: string
  campus: string | null
  location: string | null
  created_at: string
}

export interface Match {
  id: string
  user_a: string
  user_b: string
  meeting_date: string
  meeting_start: string
  meeting_end: string
  meeting_location: string | null
  meeting_code: string
  status: string
  created_at: string
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  message: string
  is_read: boolean
  created_at: string
}

export interface Memory {
  id: string
  user_id: string
  image_url: string
  caption: string | null
  likes_count: number
  created_at: string
}

export interface MemoryLike {
  id: string
  memory_id: string
  user_id: string
  created_at: string
}
