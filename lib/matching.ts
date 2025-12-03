import type { Profile, AvailabilitySlot, Match } from "./supabaseClient"

// Types for matching algorithm
interface UserWithData {
  userId: string
  profile: Profile
  slots: AvailabilitySlot[]
}

interface CandidatePair {
  userA: UserWithData
  userB: UserWithData
  score: number
  overlappingSlot: {
    date: string
    start: string
    end: string
    location: string | null
  }
}

/**
 * Generate a unique meeting code like "BILGI-7A9X"
 */
function generateMeetingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Avoid confusing characters
  let code = ""
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `BILGI-${code}`
}

/**
 * Calculate interest similarity score between two users (Jaccard similarity)
 */
function calculateInterestScore(interestsA: string[], interestsB: string[]): number {
  if (interestsA.length === 0 || interestsB.length === 0) {
    return 0
  }

  const setA = new Set(interestsA)
  const setB = new Set(interestsB)

  let intersection = 0
  for (const item of setA) {
    if (setB.has(item)) {
      intersection++
    }
  }

  const union = setA.size + setB.size - intersection
  return union > 0 ? intersection / union : 0
}

/**
 * Convert time string "HH:MM:SS" or "HH:MM" to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":")
  const hours = Number.parseInt(parts[0], 10)
  const minutes = Number.parseInt(parts[1], 10)
  return hours * 60 + minutes
}

/**
 * Find overlapping time slot between two users
 * Returns the overlapping slot if found, null otherwise
 */
function findOverlappingSlot(
  slotsA: AvailabilitySlot[],
  slotsB: AvailabilitySlot[],
): { date: string; start: string; end: string; location: string | null } | null {
  for (const slotA of slotsA) {
    for (const slotB of slotsB) {
      // Check if same date
      if (slotA.slot_date !== slotB.slot_date) continue

      // Check if same campus (if both specified)
      if (slotA.campus && slotB.campus && slotA.campus !== slotB.campus) continue

      // Check time overlap
      const startA = timeToMinutes(slotA.start_time)
      const endA = timeToMinutes(slotA.end_time)
      const startB = timeToMinutes(slotB.start_time)
      const endB = timeToMinutes(slotB.end_time)

      const overlapStart = Math.max(startA, startB)
      const overlapEnd = Math.min(endA, endB)

      // Need at least 30 minutes of overlap
      if (overlapEnd - overlapStart >= 30) {
        // Format times back to strings
        const startHours = Math.floor(overlapStart / 60)
        const startMins = overlapStart % 60
        const endHours = Math.floor(overlapEnd / 60)
        const endMins = overlapEnd % 60

        return {
          date: slotA.slot_date,
          start: `${String(startHours).padStart(2, "0")}:${String(startMins).padStart(2, "0")}`,
          end: `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`,
          location: slotA.campus || slotB.campus || slotA.location || slotB.location,
        }
      }
    }
  }

  return null
}

/**
 * Main matching function that:
 * 1. Loads active users with profiles and availability
 * 2. Computes candidate pairs with overlapping availability
 * 3. Scores pairs by interest similarity
 * 4. Greedily assigns matches
 * 5. Returns match data to be inserted
 */
export async function runMatching(supabaseAdmin: {
  from: (table: string) => {
    select: (columns: string) => {
      eq?: (column: string, value: unknown) => Promise<{ data: unknown[]; error: unknown }>
    } & Promise<{ data: unknown[]; error: unknown }>
    insert: (data: unknown) => Promise<{ data: unknown; error: unknown }>
  }
}): Promise<{ matches: Omit<Match, "id" | "created_at">[]; summary: string }> {
  // 1. Load all active profiles
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("is_active", true)
    .eq("profile_completed", true)

  if (profilesError || !profiles) {
    throw new Error("Failed to load profiles")
  }

  // 2. Load all availability slots
  const { data: allSlots, error: slotsError } = await supabaseAdmin.from("availability_slots").select("*")

  if (slotsError || !allSlots) {
    throw new Error("Failed to load availability slots")
  }

  // 3. Group slots by user
  const slotsByUser = new Map<string, AvailabilitySlot[]>()
  for (const slot of allSlots as AvailabilitySlot[]) {
    const existing = slotsByUser.get(slot.user_id) || []
    existing.push(slot)
    slotsByUser.set(slot.user_id, existing)
  }

  // 4. Build user data array
  const users: UserWithData[] = (profiles as Profile[])
    .filter((p) => slotsByUser.has(p.user_id)) // Only users with availability
    .map((p) => ({
      userId: p.user_id,
      profile: p,
      slots: slotsByUser.get(p.user_id) || [],
    }))

  console.log(`[Matching] Found ${users.length} active users with availability`)

  // 5. Generate all candidate pairs with overlapping availability
  const candidates: CandidatePair[] = []

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const userA = users[i]
      const userB = users[j]

      const overlappingSlot = findOverlappingSlot(userA.slots, userB.slots)

      if (overlappingSlot) {
        const score = calculateInterestScore(userA.profile.interests || [], userB.profile.interests || [])

        candidates.push({
          userA,
          userB,
          score,
          overlappingSlot,
        })
      }
    }
  }

  console.log(`[Matching] Found ${candidates.length} candidate pairs`)

  // 6. Sort candidates by score (descending)
  candidates.sort((a, b) => b.score - a.score)

  // 7. Greedy matching - each user can only be matched once
  const matchedUsers = new Set<string>()
  const finalMatches: Omit<Match, "id" | "created_at">[] = []

  for (const candidate of candidates) {
    const { userA, userB, overlappingSlot } = candidate

    // Skip if either user is already matched
    if (matchedUsers.has(userA.userId) || matchedUsers.has(userB.userId)) {
      continue
    }

    // Create the match
    const match: Omit<Match, "id" | "created_at"> = {
      user_a: userA.userId,
      user_b: userB.userId,
      meeting_date: overlappingSlot.date,
      meeting_start: overlappingSlot.start,
      meeting_end: overlappingSlot.end,
      meeting_location: overlappingSlot.location,
      meeting_code: generateMeetingCode(),
      status: "pending",
    }

    finalMatches.push(match)
    matchedUsers.add(userA.userId)
    matchedUsers.add(userB.userId)
  }

  console.log(`[Matching] Created ${finalMatches.length} matches`)

  const summary = `Matching complete: ${users.length} users, ${candidates.length} candidate pairs, ${finalMatches.length} final matches, ${users.length - matchedUsers.size} unmatched users`

  return { matches: finalMatches, summary }
}

/**
 * Helper to send match notification emails (stub - implement with actual email service)
 */
export async function sendMatchNotifications(
  matches: Match[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _profiles: Map<string, Profile>,
): Promise<void> {
  for (const match of matches) {
    // TODO: Implement actual email sending with Resend or similar
    console.log(`[Email] Would send match notification:`)
    console.log(`  - User A: ${match.user_a}`)
    console.log(`  - User B: ${match.user_b}`)
    console.log(`  - Meeting: ${match.meeting_date} ${match.meeting_start}-${match.meeting_end}`)
    console.log(`  - Code: ${match.meeting_code}`)
  }
}
