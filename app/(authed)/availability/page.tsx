"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase, type AvailabilitySlot, type Profile } from "@/lib/supabaseClient"
import { CAMPUS_LOCATION_OPTIONS, HOURLY_TIME_OPTIONS, MEETING_DATE_RANGE, SANTRAL_CAMPUS } from "@/lib/constants"
import { StarsBackground } from "@/components/StarsBackground"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const getEndTimeFromStart = (startTime: string) => {
  const [hours, minutes] = startTime.split(":").map((part) => Number.parseInt(part, 10))
  const endHours = hours + 1
  return `${String(endHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

const getLocationOptions = (campus?: string | null) => {
  if (!campus) return []
  const key = campus as keyof typeof CAMPUS_LOCATION_OPTIONS
  return CAMPUS_LOCATION_OPTIONS[key] || []
}

const resolveLocationLabel = (campus: string | null | undefined, value: string | null | undefined) => {
  if (!value) return ""
  const match = getLocationOptions(campus).find((item) => item.value === value || item.label === value)
  return match?.label || value
}

const parseGiftPreferences = (giftPreferences?: string | string[] | null) => {
  if (Array.isArray(giftPreferences)) {
    return giftPreferences.map((item) => item.trim()).filter(Boolean)
  }

  if (typeof giftPreferences === "string") {
    return giftPreferences.split(",").map((item) => item.trim()).filter(Boolean)
  }

  return []
}

const getProfileStatus = (profile: Partial<Profile> | null) => {
  const missingFields: string[] = []

  if (!profile?.name || profile.name.trim() === "") {
    missingFields.push("İsim")
  }
  if (!profile?.gender) {
    missingFields.push("Cinsiyet")
  }
  if (!profile?.department || profile.department.trim() === "") {
    missingFields.push("Bölüm")
  }
  if (!profile?.class_year) {
    missingFields.push("Sınıf")
  }
  if (!profile?.interests || profile.interests.length === 0) {
    missingFields.push("İlgi alanı (en az 1)")
  }
  const giftPrefs = parseGiftPreferences(profile?.gift_preferences)
  if (giftPrefs.length === 0) {
    missingFields.push("Hediye tercihi (en az 1)")
  }

  return {
    isComplete: missingFields.length === 0 && Boolean(profile?.profile_completed),
    missingFields,
  }
}

const parseMissingField = (field: string) => field.replace(/\s*\(.*?\)/g, "").trim()

const formatMissingForMessage = (fields: string[]) => fields.map((field) => parseMissingField(field)).join(", ")

export default function AvailabilityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [profileStatus, setProfileStatus] = useState<{ isComplete: boolean; missingFields: string[] }>({
    isComplete: false,
    missingFields: [],
  })
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const { startDateString: startDate, endDateString: endDate } = MEETING_DATE_RANGE
  const defaultStart = HOURLY_TIME_OPTIONS[0]?.value || "09:00"
  const [newSlot, setNewSlot] = useState({
    slot_date: startDate,
    start_time: defaultStart,
    end_time: getEndTimeFromStart(defaultStart),
    location: "",
  })
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          router.push("/login")
          return
        }

        setUser({ id: authUser.id })

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("name, gender, department, class_year, interests, gift_preferences, about_me, profile_completed")
          .eq("user_id", authUser.id)
          .single()

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Error loading profile for availability:", profileError)
        }

        const status = getProfileStatus((profileData as Partial<Profile>) || null)
        setProfileStatus(status)

        // Load existing slots
        const { data: existingSlots } = await supabase
          .from("availability_slots")
          .select("*")
          .eq("user_id", authUser.id)
          .order("slot_date", { ascending: true })

        if (existingSlots) {
          setSlots(existingSlots)
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!profileStatus.isComplete) {
      const missingText =
        profileStatus.missingFields.length > 0
          ? `Eksik alanlar: ${formatMissingForMessage(profileStatus.missingFields)}`
          : "Profilini kaydedip tamamlanmış hale getirmelisin."
      setMessage({
        type: "error",
        text: `Profilini tamamlamadan müsaitlik ekleyemezsin. ${missingText}`,
      })
      return
    }

    const dateInRange = newSlot.slot_date >= startDate && newSlot.slot_date <= endDate
    if (!dateInRange) {
      setMessage({ type: "error", text: "Tarih yalnızca 23-26 Aralık aralığında seçilebilir." })
      return
    }

    const validTime = HOURLY_TIME_OPTIONS.some((option) => option.value === newSlot.start_time)
    if (!validTime) {
      setMessage({ type: "error", text: "Saat seçimi 09:00 - 21:00 aralığından yapılmalıdır." })
      return
    }

    if (!newSlot.location) {
      setMessage({ type: "error", text: "Konum seçimi zorunludur." })
      return
    }

    setSaving(true)
    setMessage(null)

    const calculatedEnd = getEndTimeFromStart(newSlot.start_time)
    const locationLabel = resolveLocationLabel(SANTRAL_CAMPUS.value, newSlot.location)

    try {
      const { data, error } = await supabase
        .from("availability_slots")
        .insert({
          user_id: user.id,
          slot_date: newSlot.slot_date,
          start_time: newSlot.start_time,
          end_time: calculatedEnd,
          campus: SANTRAL_CAMPUS.value,
          location: locationLabel || null,
        })
        .select()
        .single()

      if (error) throw error

      setSlots([...slots, data])
      setNewSlot({
        slot_date: startDate,
        start_time: defaultStart,
        end_time: getEndTimeFromStart(defaultStart),
        location: "",
      })
      setMessage({ type: "success", text: "Müsaitlik eklendi!" })
    } catch (error) {
      console.error("Error adding slot:", error)
      setMessage({ type: "error", text: "Müsaitlik eklenirken bir hata oluştu." })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const { error } = await supabase.from("availability_slots").delete().eq("id", slotId)

      if (error) throw error

      setSlots(slots.filter((s) => s.id !== slotId))
      setMessage({ type: "success", text: "Müsaitlik silindi." })
    } catch (error) {
      console.error("Error deleting slot:", error)
      setMessage({ type: "error", text: "Müsaitlik silinirken bir hata oluştu." })
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("tr-TR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5)
  }

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <StarsBackground />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-2 border-bilgi-red border-t-transparent rounded-full" />
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen">
      <StarsBackground />

      <div className="relative z-10 pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl md:text-4xl font-bold gradient-text mb-2">Müsaitlik Zamanları</h1>
            <p className="text-muted-foreground">Buluşmaya uygun olduğun zamanları ekle</p>
          </div>

          {!profileStatus.isComplete && (
            <div className="bg-gradient-to-r from-red-500/15 via-dark-card to-red-500/5 border border-red-500/30 rounded-2xl p-5 md:p-6 shadow-lg shadow-red-500/15 mb-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-3">
                  <div className="h-7 w-11 flex items-center justify-center rounded-xl text-red-200">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 9v4" />
                      <path d="M12 17h.01" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-red-50 text-lg">Önce profilini tamamla</p>
                    <p className="text-sm text-red-100/85 leading-relaxed">
                      İsim, Cinsiyet, Bölüm, Sınıf, İlgi Alanı ve Hediye Tercihi alanlarını doldurup kaydetmelisin.
                      Hakkında alanı isteğe bağlı.
                    </p>
                    {profileStatus.missingFields.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {profileStatus.missingFields.map((field) => (
                          <span
                            key={field}
                            className="px-3 py-1 rounded-full border border-red-500/40 bg-red-500/10 text-red-50 text-xs font-medium"
                          >
                            {parseMissingField(field)}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-red-100/70">Kaydedince form otomatik açılacak.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/profile")}
                  className="w-full md:w-auto border-red-500/40 text-red-50 hover:bg-red-500/10"
                >
                  Profilimi Tamamla
                </Button>
              </div>
            </div>
          )}

          {/* Add new slot form */}
          <div className="bg-dark-card border border-border rounded-2xl p-6 card-glow mb-8">
            <h2 className="font-heading text-xl font-bold mb-6 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-bilgi-red"
              >
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
                <line x1="12" x2="12" y1="14" y2="18" />
                <line x1="10" x2="14" y1="16" y2="16" />
              </svg>
              Yeni Müsaitlik Ekle
            </h2>

            <form onSubmit={handleAddSlot} className="space-y-4">
              <fieldset disabled={saving || !profileStatus.isComplete} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="slot_date">Tarih</Label>
                    <Input
                      id="slot_date"
                      type="date"
                      value={newSlot.slot_date}
                      onChange={(e) => setNewSlot({ ...newSlot, slot_date: e.target.value })}
                      required
                      min={startDate}
                      max={endDate}
                      className="mt-1 bg-dark-bg border-border"
                    />
                  </div>
                  <div>
                    <Label htmlFor="start_time">Başlangıç</Label>
                    <select
                      id="start_time"
                      value={newSlot.start_time}
                      onChange={(e) =>
                        setNewSlot({
                          ...newSlot,
                          start_time: e.target.value,
                          end_time: getEndTimeFromStart(e.target.value),
                        })
                      }
                      required
                      className="mt-1 w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-foreground"
                    >
                      {HOURLY_TIME_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="end_time">Bitiş</Label>
                    <Input
                      id="end_time"
                      type="text"
                      value={newSlot.end_time}
                      disabled
                      className="mt-1 bg-dark-bg border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Kampüs İçindeki Konum</Label>
                    <select
                      id="location"
                      value={newSlot.location}
                      onChange={(e) => setNewSlot({ ...newSlot, location: e.target.value })}
                      className="mt-1 w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-foreground"
                      required
                    >
                      <option value="">Seçin</option>
                      {getLocationOptions(SANTRAL_CAMPUS.value).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-dark-bg/60 p-3 text-sm text-muted-foreground">
                  Bu etkinlik yalnızca <span className="text-foreground font-medium">{SANTRAL_CAMPUS.label}</span> kampüsünde
                  gerçekleşecek. Lütfen kampüs içindeki bir buluşma noktasını seçin.
                </div>
              </fieldset>

              <Button type="submit" disabled={saving || !profileStatus.isComplete} className="btn-bilgi">
                {profileStatus.isComplete ? (saving ? "Ekleniyor..." : "Müsaitlik Ekle") : "Önce Profilini Tamamla"}
              </Button>
            </form>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-500/10 border border-green-500/30 text-green-500"
                  : "bg-red-500/10 border border-red-500/30 text-red-500"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Existing slots */}
          <div className="bg-dark-card border border-border rounded-2xl p-6 card-glow">
            <h2 className="font-heading text-xl font-bold mb-6 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gold-accent"
              >
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M3 10h18" />
              </svg>
              Mevcut Müsaitlikler
            </h2>

            {slots.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Henüz müsaitlik eklemediniz. Yukarıdaki formu kullanarak ekleyebilirsiniz.
              </p>
            ) : (
              <div className="space-y-3">
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-medium text-foreground">{formatDate(slot.slot_date)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        <span className="ml-2">• {SANTRAL_CAMPUS.label}</span>
                        {slot.campus && slot.campus !== SANTRAL_CAMPUS.value && (
                          <span className="ml-2">• {slot.campus}</span>
                        )}
                        {slot.location && (
                          <span className="ml-2">• {resolveLocationLabel(slot.campus, slot.location)}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" x2="10" y1="11" y2="17" />
                        <line x1="14" x2="14" y1="11" y2="17" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {slots.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <Button onClick={() => router.push("/match")} className="w-full btn-bilgi">
                  Eşleşmemi Görüntüle
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
