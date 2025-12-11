import type { SupabaseClient } from "@supabase/supabase-js"
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
  overlapMinutes: number
  campusMatch: boolean
  locationMatch: boolean
  crossGender: boolean
  overlappingSlot: {
    date: string
    start: string
    end: string
    location: string | null
    locationMatch: boolean
  }
}

/**
 * Generate a unique meeting code like "BILGI-XXXXXX"
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
 * Parse gift preferences (comma separated) into string array
 */
function parseGiftPreferences(pref?: string | null): string[] {
  if (!pref) return []
  return pref
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
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

function minutesToTime(totalMinutes: number): string {
  const minutesInDay = 24 * 60
  const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

/**
 * Build meeting location info from two slots (campus + optional detailed location)
 */
function buildLocation(
  slotA: AvailabilitySlot,
  slotB: AvailabilitySlot,
): { location: string | null; locationMatch: boolean } {
  const campus = slotA.campus || slotB.campus || null
  const rawA = slotA.location?.trim()
  const rawB = slotB.location?.trim()
  const locationMatch = Boolean(rawA && rawB && rawA.toLowerCase() === rawB.toLowerCase())
  const locationDetail = locationMatch ? rawA : rawA || rawB || null

  if (locationDetail && campus) {
    return { location: `${campus} - ${locationDetail}`, locationMatch }
  }
  if (locationDetail) {
    return { location: locationDetail, locationMatch }
  }
  if (campus) {
    return { location: campus, locationMatch: false }
  }
  return { location: null, locationMatch }
}

/**
 * Returns true if both users have gender set and they are different
 */
function isCrossGender(profileA: Profile, profileB: Profile): boolean {
  return Boolean(profileA.gender && profileB.gender && profileA.gender !== profileB.gender)
}

/**
 * Find overlapping time slot between two users
 * Returns the overlapping slot if found, null otherwise
 */
function findBestOverlappingSlot(
  slotsA: AvailabilitySlot[],
  slotsB: AvailabilitySlot[],
): {
  date: string
  start: string
  end: string
  location: string | null
  minutes: number
  campusMatch: boolean
  locationMatch: boolean
} | null {
  let best: {
    date: string
    start: string
    end: string
    location: string | null
    minutes: number
    campusMatch: boolean
    locationMatch: boolean
  } | null = null

  for (const slotA of slotsA) {
    for (const slotB of slotsB) {
      if (slotA.slot_date !== slotB.slot_date) continue

      const startA = timeToMinutes(slotA.start_time)
      const endA = timeToMinutes(slotA.end_time)
      const startB = timeToMinutes(slotB.start_time)
      const endB = timeToMinutes(slotB.end_time)

      const overlapStart = Math.max(startA, startB)
      const overlapEnd = Math.min(endA, endB)
      const overlapMinutes = overlapEnd - overlapStart

      // Require minimum 30 minutes shared availability
      if (overlapMinutes < 30) continue

      const campusMatch = Boolean(slotA.campus && slotB.campus && slotA.campus === slotB.campus)
      const { location, locationMatch } = buildLocation(slotA, slotB)

      const startHours = Math.floor(overlapStart / 60)
      const startMins = overlapStart % 60
      const endHours = Math.floor(overlapEnd / 60)
      const endMins = overlapEnd % 60

      const candidate = {
        date: slotA.slot_date,
        start: `${String(startHours).padStart(2, "0")}:${String(startMins).padStart(2, "0")}`,
        end: `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`,
        location,
        minutes: overlapMinutes,
        campusMatch,
        locationMatch,
      }

      // Choose the slot with longest overlap, prefer campus match on ties
      if (
        !best ||
        candidate.minutes > best.minutes ||
        (candidate.minutes === best.minutes && candidate.campusMatch && !best.campusMatch)
      ) {
        best = candidate
      }
    }
  }

  return best
}

/**
 * Relaxed slot finder to ensure everyone can be paired.
 * Picks the closest-in-time slot (same day preferred), even if there is no real overlap.
 */
function findRelaxedSlot(
  slotsA: AvailabilitySlot[],
  slotsB: AvailabilitySlot[],
): {
  date: string
  start: string
  end: string
  location: string | null
  minutes: number
  gapMinutes: number
  campusMatch: boolean
  dateDiffMinutes: number
  locationMatch: boolean
} | null {
  let best: {
    date: string
    start: string
    end: string
    location: string | null
    minutes: number
    gapMinutes: number
    campusMatch: boolean
    dateDiffMinutes: number
    locationMatch: boolean
  } | null = null

  for (const slotA of slotsA) {
    for (const slotB of slotsB) {
      const dateA = new Date(`${slotA.slot_date}T00:00:00Z`)
      const dateB = new Date(`${slotB.slot_date}T00:00:00Z`)
      const dateDiffMinutes = Math.abs(dateA.getTime() - dateB.getTime()) / 60000

      const startA = timeToMinutes(slotA.start_time)
      const endA = timeToMinutes(slotA.end_time)
      const startB = timeToMinutes(slotB.start_time)
      const endB = timeToMinutes(slotB.end_time)

      const overlapStart = Math.max(startA, startB)
      const overlapEnd = Math.min(endA, endB)
      const overlapMinutes = Math.max(0, overlapEnd - overlapStart)
      const gapMinutes = overlapMinutes > 0 ? 0 : overlapStart - overlapEnd

      const meetingStartMinutes = overlapMinutes > 0 ? overlapStart : Math.max(startA, startB)
      const meetingDuration = overlapMinutes > 0 ? overlapMinutes : 30
      const meetingEndMinutes = meetingStartMinutes + Math.max(meetingDuration, 15)

      const campusMatch = Boolean(slotA.campus && slotB.campus && slotA.campus === slotB.campus)
      const { location, locationMatch } = buildLocation(slotA, slotB)
      const meetingDate = dateA <= dateB ? slotA.slot_date : slotB.slot_date

      const candidate = {
        date: meetingDate,
        start: minutesToTime(meetingStartMinutes),
        end: minutesToTime(meetingEndMinutes),
        location,
        minutes: overlapMinutes,
        gapMinutes: Math.max(gapMinutes, 0),
        campusMatch,
        dateDiffMinutes,
        locationMatch,
      }

      if (
        !best ||
        candidate.minutes > best.minutes || // prefer real overlap
        (candidate.minutes === best.minutes && candidate.gapMinutes < best.gapMinutes) || // then smaller gap
        (candidate.minutes === best.minutes &&
          candidate.gapMinutes === best.gapMinutes &&
          candidate.dateDiffMinutes < best.dateDiffMinutes)
      ) {
        best = candidate
      }
    }
  }

  return best
}

/**
 * Main matching function that:
 * 1. Loads active users with profiles and availability
 * 2. Computes candidate pairs with overlapping availability
 * 3. Scores pairs by interest similarity
 * 4. Greedily assigns matches
 * 5. Returns match data to be inserted
 */
export async function runMatching(
  supabaseAdmin: SupabaseClient,
): Promise<{ matches: Omit<Match, "id" | "created_at">[]; summary: string }> {
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
  const crossGenderCandidates: CandidatePair[] = []
  const sameGenderCandidates: CandidatePair[] = []
  const crossCounts = new Map<string, number>()
  const sameCounts = new Map<string, number>()

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const userA = users[i]
      const userB = users[j]

      const overlappingSlot = findBestOverlappingSlot(userA.slots, userB.slots)

      if (!overlappingSlot) continue

      const interestScore = calculateInterestScore(userA.profile.interests || [], userB.profile.interests || [])
      const giftScore = calculateInterestScore(
        parseGiftPreferences(userA.profile.gift_preferences),
        parseGiftPreferences(userB.profile.gift_preferences),
      )

      // Overlap weight increases with duration (up to 2 hours cap)
      const overlapWeight = Math.min(overlappingSlot.minutes / 120, 1)
      const campusBonus = overlappingSlot.campusMatch ? 0.1 : 0
      const locationBonus = overlappingSlot.locationMatch ? 0.05 : 0

      const score = interestScore * 0.5 + giftScore * 0.2 + overlapWeight * 0.3 + campusBonus + locationBonus
      const crossGender = isCrossGender(userA.profile, userB.profile)

      const candidate: CandidatePair = {
        userA,
        userB,
        score,
        overlapMinutes: overlappingSlot.minutes,
        campusMatch: overlappingSlot.campusMatch,
        locationMatch: overlappingSlot.locationMatch,
        crossGender,
        overlappingSlot,
      }

      if (crossGender) {
        crossGenderCandidates.push(candidate)
        crossCounts.set(userA.userId, (crossCounts.get(userA.userId) || 0) + 1)
        crossCounts.set(userB.userId, (crossCounts.get(userB.userId) || 0) + 1)
      } else {
        sameGenderCandidates.push(candidate)
        sameCounts.set(userA.userId, (sameCounts.get(userA.userId) || 0) + 1)
        sameCounts.set(userB.userId, (sameCounts.get(userB.userId) || 0) + 1)
      }
    }
  }

  const totalCandidates = crossGenderCandidates.length + sameGenderCandidates.length
  console.log(`[Matching] Found ${totalCandidates} candidate pairs (${crossGenderCandidates.length} cross-gender, ${sameGenderCandidates.length} same/unspecified)`)

  // 6. Sort candidates to prioritize users with fewer options, then by score and overlap length
  const sortCandidates = (arr: CandidatePair[], counts: Map<string, number>) =>
    arr.sort((a, b) => {
      const minOptionsA = Math.min(counts.get(a.userA.userId) || 0, counts.get(a.userB.userId) || 0)
      const minOptionsB = Math.min(counts.get(b.userA.userId) || 0, counts.get(b.userB.userId) || 0)

      if (minOptionsA !== minOptionsB) return minOptionsA - minOptionsB
      if (b.score !== a.score) return b.score - a.score
      return b.overlapMinutes - a.overlapMinutes
    })

  sortCandidates(crossGenderCandidates, crossCounts)
  sortCandidates(sameGenderCandidates, sameCounts)

  // 7. Greedy matching - each user can only be matched once
  const matchedUsers = new Set<string>()
  const finalMatches: Omit<Match, "id" | "created_at">[] = []
  let fallbackMatches = 0

  const greedyAssign = (candidates: CandidatePair[]) => {
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
  }

  // First pass: cross-gender, Second pass: same/unspecified
  greedyAssign(crossGenderCandidates)

  const runRelaxedPass = () => {
    const pool = users.filter((u) => !matchedUsers.has(u.userId))
    if (pool.length <= 1) return

    const relaxedCrossCandidates: CandidatePair[] = []
    const relaxedSameCandidates: CandidatePair[] = []
    const relaxedCrossCounts = new Map<string, number>()
    const relaxedSameCounts = new Map<string, number>()

    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const userA = pool[i]
        const userB = pool[j]

        const relaxedSlot = findRelaxedSlot(userA.slots, userB.slots)
        if (!relaxedSlot) continue

        const interestScore = calculateInterestScore(userA.profile.interests || [], userB.profile.interests || [])
        const giftScore = calculateInterestScore(
          parseGiftPreferences(userA.profile.gift_preferences),
          parseGiftPreferences(userB.profile.gift_preferences),
        )

        const overlapFactor = relaxedSlot.minutes > 0 ? Math.min(relaxedSlot.minutes / 90, 1) : 0
        const gapPenalty = Math.min(relaxedSlot.gapMinutes / 180, 1) // penalize >3h gaps
        const datePenalty = Math.min(relaxedSlot.dateDiffMinutes / (60 * 24 * 3), 1) // penalize >3 days apart
        const timeScore = overlapFactor > 0 ? overlapFactor : 1 - gapPenalty
        const campusBonus = relaxedSlot.campusMatch ? 0.1 : 0
        const locationBonus = relaxedSlot.locationMatch ? 0.05 : 0

        const score =
          interestScore * 0.45 + giftScore * 0.2 + timeScore * 0.25 + campusBonus + locationBonus - datePenalty * 0.1
        const crossGender = isCrossGender(userA.profile, userB.profile)

        const candidate: CandidatePair = {
          userA,
          userB,
          score,
          overlapMinutes: relaxedSlot.minutes,
          campusMatch: relaxedSlot.campusMatch,
          locationMatch: relaxedSlot.locationMatch,
          crossGender,
          overlappingSlot: {
            date: relaxedSlot.date,
            start: relaxedSlot.start,
            end: relaxedSlot.end,
            location: relaxedSlot.location || "Koordinasyon gerekli",
            locationMatch: relaxedSlot.locationMatch,
          },
        }

        if (crossGender) {
          relaxedCrossCandidates.push(candidate)
          relaxedCrossCounts.set(userA.userId, (relaxedCrossCounts.get(userA.userId) || 0) + 1)
          relaxedCrossCounts.set(userB.userId, (relaxedCrossCounts.get(userB.userId) || 0) + 1)
        } else {
          relaxedSameCandidates.push(candidate)
          relaxedSameCounts.set(userA.userId, (relaxedSameCounts.get(userA.userId) || 0) + 1)
          relaxedSameCounts.set(userB.userId, (relaxedSameCounts.get(userB.userId) || 0) + 1)
        }
      }
    }

    sortCandidates(relaxedCrossCandidates, relaxedCrossCounts)
    sortCandidates(relaxedSameCandidates, relaxedSameCounts)

    const fallbackAssign = (candidates: CandidatePair[]) => {
      for (const candidate of candidates) {
        const { userA, userB, overlappingSlot } = candidate
        if (matchedUsers.has(userA.userId) || matchedUsers.has(userB.userId)) continue

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
        fallbackMatches++
      }
    }

    // Fallback also prefers cross-gender first, then same/unspecified
    fallbackAssign(relaxedCrossCandidates)
    fallbackAssign(relaxedSameCandidates)
  }

  // 8. Cross-gender relaxed attempt before any same-gender pairing
  runRelaxedPass()

  // 9. Same/unspecified gender with overlapping slots
  greedyAssign(sameGenderCandidates)

  // 10. Final relaxed pass for any remaining users
  runRelaxedPass()

  console.log(`[Matching] Created ${finalMatches.length} matches`)

  const summary = `Matching complete: ${users.length} users, ${totalCandidates} candidate pairs (${crossGenderCandidates.length} cross-gender), ${finalMatches.length} final matches (${fallbackMatches} fallback), ${users.length - matchedUsers.size} unmatched users`

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
