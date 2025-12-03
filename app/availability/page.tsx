"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase, type AvailabilitySlot } from "@/lib/supabaseClient"
import { CAMPUS_OPTIONS } from "@/lib/constants"
import { StarsBackground } from "@/components/StarsBackground"
import { UserNav } from "@/components/UserNav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AvailabilityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [userName, setUserName] = useState<string>("")
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [newSlot, setNewSlot] = useState({
    slot_date: "",
    start_time: "",
    end_time: "",
    campus: "",
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

        // Load profile for nav
        const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", authUser.id).single()

        if (profile?.name) {
          setUserName(profile.name)
        }

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

    // Validate times
    if (newSlot.start_time >= newSlot.end_time) {
      setMessage({ type: "error", text: "Bitiş saati başlangıç saatinden sonra olmalıdır." })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const { data, error } = await supabase
        .from("availability_slots")
        .insert({
          user_id: user.id,
          slot_date: newSlot.slot_date,
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          campus: newSlot.campus || null,
          location: newSlot.location || null,
        })
        .select()
        .single()

      if (error) throw error

      setSlots([...slots, data])
      setNewSlot({
        slot_date: "",
        start_time: "",
        end_time: "",
        campus: "",
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
      <UserNav userName={userName} />

      <div className="relative z-10 pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl md:text-4xl font-bold gradient-text mb-2">Müsaitlik Zamanları</h1>
            <p className="text-muted-foreground">Buluşmaya uygun olduğun zamanları ekle</p>
          </div>

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="slot_date">Tarih</Label>
                  <Input
                    id="slot_date"
                    type="date"
                    value={newSlot.slot_date}
                    onChange={(e) => setNewSlot({ ...newSlot, slot_date: e.target.value })}
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="mt-1 bg-dark-bg border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="start_time">Başlangıç</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={newSlot.start_time}
                    onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                    required
                    className="mt-1 bg-dark-bg border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">Bitiş</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={newSlot.end_time}
                    onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                    required
                    className="mt-1 bg-dark-bg border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="campus">Kampüs</Label>
                  <select
                    id="campus"
                    value={newSlot.campus}
                    onChange={(e) => setNewSlot({ ...newSlot, campus: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-foreground"
                  >
                    <option value="">Seçin (Opsiyonel)</option>
                    {CAMPUS_OPTIONS.map((campus) => (
                      <option key={campus.value} value={campus.value}>
                        {campus.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="location">Konum Detayı</Label>
                  <Input
                    id="location"
                    type="text"
                    value={newSlot.location}
                    onChange={(e) => setNewSlot({ ...newSlot, location: e.target.value })}
                    placeholder="Örn: Kütüphane önü"
                    className="mt-1 bg-dark-bg border-border"
                  />
                </div>
              </div>

              <Button type="submit" disabled={saving} className="btn-bilgi">
                {saving ? "Ekleniyor..." : "Müsaitlik Ekle"}
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
                        {slot.campus && (
                          <span className="ml-2">
                            • {CAMPUS_OPTIONS.find((c) => c.value === slot.campus)?.label || slot.campus}
                          </span>
                        )}
                        {slot.location && <span className="ml-2">• {slot.location}</span>}
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
