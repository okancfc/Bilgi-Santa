"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { ADMIN_EMAILS } from "@/lib/constants"
import { StarsBackground } from "@/components/StarsBackground"
import { Button } from "@/components/ui/button"

interface BreakdownItem {
  name: string
  count: number
}

interface AdminStats {
  totals: {
    totalUsers: number
    activeUsers: number
    completedProfiles: number
    usersWithSlots: number
    slotsCount: number
    matches: number
    matchedUsers: number
    readyForMatch: number
  }
  rates: {
    completion: number
    readiness: number
    matchCoverage: number
    activeRate: number
  }
  breakdowns: {
    gender: Record<string, number>
    classYears: Record<string, number>
    departments: BreakdownItem[]
    locations: BreakdownItem[]
  }
  readinessGaps: {
    missingSlots: number
    incompleteProfiles: number
    readyButUnmatched: number
  }
  recentProfiles: Array<{
    id: string
    name: string | null
    email: string | null
    created_at: string
    profile_completed: boolean
    has_slots: boolean
  }>
}

interface ContactMessage {
  id: string
  name: string
  email: string
  message: string
  is_read: boolean
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [matchingStatus, setMatchingStatus] = useState<"idle" | "running" | "success" | "error">("idle")
  const [matchingResult, setMatchingResult] = useState<string>("")
  const [countdownDate, setCountdownDate] = useState<string>("")
  const [countdownTime, setCountdownTime] = useState<string>("00:00")
  const [countdownEnabled, setCountdownEnabled] = useState<boolean>(true)
  const [countdownStatus, setCountdownStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [countdownMessage, setCountdownMessage] = useState<string>("")

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch("/api/admin/stats")
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Failed to load stats")
      }
      const data = (await res.json()) as { stats?: AdminStats }
      if (data?.stats) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Admin stats fetch error:", error)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/messages")
      if (res.ok) {
        const data = (await res.json()) as { messages?: ContactMessage[] }
        const msgs = data.messages || []
        setMessages(msgs)
        setUnreadMessages(msgs.filter((m) => !m.is_read).length)
      }
    } catch (e) {
      console.error("Admin messages fetch error:", e)
    }
  }, [])

  const loadCountdownSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/countdown")
      if (res.ok) {
        const data = (await res.json()) as { settings?: { start_at?: string | null; enabled?: boolean } }
        const iso = data?.settings?.start_at
        if (iso) {
          const date = new Date(iso)
          setCountdownDate(date.toISOString().slice(0, 10))
          setCountdownTime(date.toISOString().slice(11, 16))
        }
        if (typeof data?.settings?.enabled === "boolean") {
          setCountdownEnabled(data.settings.enabled)
        }
      }
    } catch (e) {
      console.error("Countdown settings load error:", e)
    }
  }, [])

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/login")
          return
        }

        if (!ADMIN_EMAILS.includes(user.email || "")) {
          router.push("/profile")
          return
        }

        setIsAdmin(true)

        await Promise.all([loadStats(), loadMessages(), loadCountdownSettings()])
      } catch (error) {
        console.error("Error loading admin data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadAdminData()
  }, [router, loadStats, loadMessages, loadCountdownSettings])

  const handleRunMatching = async () => {
    setMatchingStatus("running")
    setMatchingResult("")

    try {
      const response = await fetch("/api/run-matching", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Matching failed")
      }

      setMatchingStatus("success")
      setMatchingResult(data.summary || `${data.matchesCreated} eşleşme oluşturuldu.`)

      await loadStats()
    } catch (error) {
      setMatchingStatus("error")
      setMatchingResult(error instanceof Error ? error.message : "Eşleştirme başarısız oldu.")
    }
  }

  const markMessageAsRead = async (messageId: string) => {
    try {
      const res = await fetch("/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: messageId, is_read: true }),
      })

      if (!res.ok) {
        throw new Error("Failed to update message")
      }

      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m)))
      setUnreadMessages((prev) => Math.max(prev - 1, 0))
    } catch (error) {
      console.error("Error marking message as read:", error)
    }
  }

  const handleSaveCountdown = async () => {
    if (!countdownDate || !countdownTime) {
      setCountdownStatus("error")
      setCountdownMessage("Tarih ve saat seçin.")
      return
    }

    setCountdownStatus("saving")
    setCountdownMessage("")
    try {
      const iso = new Date(`${countdownDate}T${countdownTime}:00`).toISOString()
      const res = await fetch("/api/settings/countdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_at: iso, enabled: countdownEnabled }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Kaydedilemedi")
      }

      setCountdownStatus("success")
      setCountdownMessage("Sayaç ayarları kaydedildi.")
    } catch (error) {
      console.error("Countdown save error:", error)
      setCountdownStatus("error")
      setCountdownMessage("Sayaç ayarları kaydedilemedi.")
    }
  }

  const formatNumber = (value?: number | null) =>
    value === undefined || value === null ? "—" : value.toLocaleString("tr-TR")
  const slotCoverage = stats?.totals.totalUsers
    ? Math.round((stats.totals.usersWithSlots / stats.totals.totalUsers) * 100)
    : 0

  const ProgressRow = ({
    label,
    value,
    hint,
    color,
  }: {
    label: string
    value: number
    hint: string
    color: string
  }) => {
    const width = Math.max(0, Math.min(100, Math.round(value || 0)))
    return (
      <div className="border border-border/60 rounded-xl p-3 bg-dark-bg/40">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-semibold text-foreground">{width}%</span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${width}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </div>
    )
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

  if (!isAdmin) {
    return null
  }

  return (
    <main className="relative min-h-screen">
      <StarsBackground />

      <div className="relative z-10 pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold gradient-text mb-1">Admin Paneli</h1>
              <p className="text-muted-foreground">Gerçek verilerle Bilgi Santa'yı yönet ve incele.</p>
            </div>
            <Button
              variant="outline"
              onClick={loadStats}
              disabled={statsLoading}
              className="border-border bg-dark-card text-foreground hover:bg-dark-bg/70"
            >
              {statsLoading ? "Veriler yenileniyor..." : "Verileri Yenile"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                title: "Toplam Kullanıcı",
                value: formatNumber(stats?.totals.totalUsers),
                hint: `Aktif: ${formatNumber(stats?.totals.activeUsers)}`,
                tone: "text-bilgi-red",
              },
              {
                title: "Profil Tamamlama",
                value: `${stats?.rates.completion ?? 0}%`,
                hint: `${formatNumber(stats?.totals.completedProfiles)} profil`,
                tone: "text-green-400",
              },
              {
                title: "Hazır (Slotlu)",
                value: formatNumber(stats?.totals.readyForMatch),
                hint: `${slotCoverage}% slot kapsamı`,
                tone: "text-blue-400",
              },
              {
                title: "Eşleşme",
                value: formatNumber(stats?.totals.matches),
                hint: `${formatNumber(stats?.totals.matchedUsers)} kullanıcı`,
                tone: "text-amber-300",
              },
              {
                title: "Okunmamış Mesaj",
                value: formatNumber(unreadMessages),
                hint: "İletişim kutusu",
                tone: "text-purple-400",
              },
            ].map((card) => (
              <div key={card.title} className="bg-dark-card border border-border rounded-xl p-4">
                <p className={`text-3xl font-bold ${card.tone}`}>{statsLoading && !stats ? "..." : card.value}</p>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.hint}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-dark-card border border-border rounded-2xl p-6 card-glow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-heading text-xl font-bold">Hazırlık & Sağlık</h2>
                    <p className="text-sm text-muted-foreground">Profil, slot ve eşleşme kalitesini anlık takip et.</p>
                  </div>
                  {statsLoading && <span className="text-xs text-muted-foreground">Güncelleniyor...</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ProgressRow
                    label="Profil Tamamlama"
                    value={stats?.rates.completion ?? 0}
                    hint={`${formatNumber(stats?.totals.completedProfiles)} / ${formatNumber(stats?.totals.totalUsers)} profil`}
                    color="bg-green-500"
                  />
                  <ProgressRow
                    label="Slot Kapsamı"
                    value={slotCoverage}
                    hint={`${formatNumber(stats?.totals.usersWithSlots)} kullanıcının slotu var`}
                    color="bg-blue-500"
                  />
                  <ProgressRow
                    label="Eşleşmeye Hazır"
                    value={stats?.rates.readiness ?? 0}
                    hint={`${formatNumber(stats?.totals.readyForMatch)} kullanıcı hazır`}
                    color="bg-teal-400"
                  />
                  <ProgressRow
                    label="Eşleşme Kapsamı"
                    value={stats?.rates.matchCoverage ?? 0}
                    hint={`${formatNumber(stats?.totals.matches)} eşleşme oluşturuldu`}
                    color="bg-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-dark-card border border-border rounded-2xl p-6">
                  <h3 className="font-heading text-lg font-semibold mb-2">Hazırlık Açıkları</h3>
                  <p className="text-sm text-muted-foreground mb-4">Eşleşme öncesi tamamlanması gereken kitleyi takip et.</p>
                  <div className="space-y-3">
                    {[
                      { label: "Eşleşmeye hazır", value: stats?.totals.readyForMatch },
                      { label: "Eşleşme bekleyen hazır kullanıcı", value: stats?.readinessGaps.readyButUnmatched },
                      { label: "Slot eklememiş (profil tamam)", value: stats?.readinessGaps.missingSlots },
                      { label: "Profil eksik", value: stats?.readinessGaps.incompleteProfiles },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-dark-bg/40 px-3 py-2"
                      >
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className="text-base font-semibold text-foreground">{formatNumber(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-dark-card border border-border rounded-2xl p-6">
                  <h3 className="font-heading text-lg font-semibold mb-2">Slot & Konum Dağılımı</h3>
                  <p className="text-sm text-muted-foreground mb-4">Hangi konumlarda yoğunlaşıldığını gör.</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Toplam Slot</span>
                      <span className="font-semibold text-foreground">{formatNumber(stats?.totals.slotsCount)}</span>
                    </div>
                    <div className="space-y-2">
                      {(stats?.breakdowns.locations || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Konum verisi yok.</p>
                      ) : (
                        (stats?.breakdowns.locations || []).map((loc) => {
                          const total = (stats?.breakdowns.locations || []).reduce((sum, item) => sum + item.count, 0) || 0
                          const percent = total ? Math.round((loc.count / total) * 100) : 0
                          return (
                            <div key={loc.name}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-foreground">{loc.name}</span>
                                <span className="text-muted-foreground">{percent}%</span>
                              </div>
                              <div className="h-2 bg-border rounded-full overflow-hidden">
                                <div className="h-full bg-bilgi-red" style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-dark-card border border-border rounded-2xl p-6">
                  <h3 className="font-heading text-lg font-semibold mb-2">Profil Dağılımı</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground mb-2">Kız / Erkek Oranı</p>
                      {(() => {
                        const female = stats?.breakdowns.gender?.kiz ?? 0
                        const male = stats?.breakdowns.gender?.erkek ?? 0
                        const unknown = stats?.breakdowns.gender?.unknown ?? 0
                        const total = female + male + unknown
                        const femalePct = total ? Math.round((female / total) * 100) : 0
                        const malePct = total ? Math.round((male / total) * 100) : 0
                        const unknownPct = total ? Math.max(0, 100 - femalePct - malePct) : 0
                        return (
                          <div className="border border-border/60 rounded-xl p-3 bg-dark-bg/40">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Kadın</span>
                              <span className="font-semibold text-foreground">{femalePct}%</span>
                            </div>
                            <div className="h-2 bg-border rounded-full overflow-hidden mb-2 flex">
                              <div className="h-full bg-pink-400" style={{ width: `${femalePct}%` }} />
                              <div className="h-full bg-blue-400" style={{ width: `${malePct}%` }} />
                              {unknownPct > 0 && <div className="h-full bg-muted-foreground/40" style={{ width: `${unknownPct}%` }} />}
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Erkek: {malePct}%</span>
                              {unknownPct > 0 && <span>Belirsiz: {unknownPct}%</span>}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Cinsiyet</p>
                      <div className="space-y-2">
                        {Object.entries(stats?.breakdowns.gender || {}).length === 0 ? (
                          <p className="text-sm text-muted-foreground">Veri yok.</p>
                        ) : (
                          Object.entries(stats?.breakdowns.gender || {}).map(([key, count]) => {
                            const total = Object.values(stats?.breakdowns.gender || {}).reduce((a, b) => a + b, 0)
                            const percent = total ? Math.round((count / total) * 100) : 0
                            const labels: Record<string, string> = { kiz: "Kız", erkek: "Erkek", unknown: "Belirtilmemiş" }
                            return (
                              <div key={key}>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-foreground">{labels[key] || key}</span>
                                  <span className="text-muted-foreground">{percent}%</span>
                                </div>
                                <div className="h-2 bg-border rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500" style={{ width: `${percent}%` }} />
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Sınıf</p>
                      <div className="space-y-2">
                        {Object.entries(stats?.breakdowns.classYears || {}).length === 0 ? (
                          <p className="text-sm text-muted-foreground">Veri yok.</p>
                        ) : (
                          Object.entries(stats?.breakdowns.classYears || {}).map(([key, count]) => {
                            const total = Object.values(stats?.breakdowns.classYears || {}).reduce((a, b) => a + b, 0)
                            const percent = total ? Math.round((count / total) * 100) : 0
                            const label = key === "Belirtilmemiş" ? key : `${key}. sınıf`
                            return (
                              <div key={key}>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-foreground capitalize">{label}</span>
                                  <span className="text-muted-foreground">{percent}%</span>
                                </div>
                                <div className="h-2 bg-border rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-400" style={{ width: `${percent}%` }} />
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-card border border-border rounded-2xl p-6">
                  <h3 className="font-heading text-lg font-semibold mb-2">En Yoğun Bölümler</h3>
                  <p className="text-sm text-muted-foreground mb-3">İlk 6 bölüm - yoğun ilgi ve potansiyel eşleşme alanları.</p>
                  <div className="space-y-2">
                    {(stats?.breakdowns.departments || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Bölüm verisi yok.</p>
                    ) : (
                      (stats?.breakdowns.departments || []).map((dept) => {
                        const percent = stats?.totals.totalUsers
                          ? Math.round((dept.count / stats.totals.totalUsers) * 100)
                          : 0
                        return (
                          <div
                            key={dept.name}
                            className="flex items-center justify-between rounded-lg border border-border/60 bg-dark-bg/40 px-3 py-2"
                          >
                            <div>
                              <p className="text-foreground text-sm font-medium">{dept.name}</p>
                              <p className="text-xs text-muted-foreground">{percent}%</p>
                            </div>
                            <span className="text-base font-semibold">{formatNumber(dept.count)}</span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-dark-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading text-lg font-semibold">Son Katılanlar</h3>
                  <span className="text-xs text-muted-foreground">Son 10 kayıt</span>
                </div>
                {stats?.recentProfiles?.length ? (
                  <div className="space-y-3">
                    {stats.recentProfiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-dark-bg/40 px-3 py-2"
                      >
                        <div>
                          <p className="font-medium text-foreground">{profile.name || "İsim yok"}</p>
                          <p className="text-xs text-muted-foreground">{profile.email || "E-posta yok"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(profile.created_at).toLocaleString("tr-TR")}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`text-xs px-2 py-1 rounded-full border ${
                              profile.profile_completed ? "border-green-500/50 text-green-400" : "border-border text-muted-foreground"
                            }`}
                          >
                            {profile.profile_completed ? "Profil tamam" : "Profil eksik"}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full border ${
                              profile.has_slots ? "border-blue-500/50 text-blue-400" : "border-border text-muted-foreground"
                            }`}
                          >
                            {profile.has_slots ? "Slot var" : "Slot yok"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Yeni kayıt yok.</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-dark-card border border-border rounded-2xl p-6 card-glow">
                <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
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
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Sayaç Ayarları
                </h2>
                <p className="text-muted-foreground mb-6">Ana sayfadaki geri sayımı başlat/durdur ve tarihi ayarla.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tarih</p>
                    <input
                      type="date"
                      className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-foreground"
                      value={countdownDate}
                      onChange={(e) => setCountdownDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Saat</p>
                    <input
                      type="time"
                      className="w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-foreground"
                      value={countdownTime}
                      onChange={(e) => setCountdownTime(e.target.value)}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-bilgi-red"
                    checked={countdownEnabled}
                    onChange={(e) => setCountdownEnabled(e.target.checked)}
                  />
                  <span className="text-sm text-foreground">Geri sayım aktif</span>
                </label>

                <Button
                  onClick={handleSaveCountdown}
                  disabled={countdownStatus === "saving"}
                  className="w-full btn-bilgi mb-3"
                >
                  {countdownStatus === "saving" ? "Kaydediliyor..." : "Sayaç Ayarlarını Kaydet"}
                </Button>

                {countdownMessage && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      countdownStatus === "success"
                        ? "bg-green-500/10 border border-green-500/30 text-green-500"
                        : "bg-red-500/10 border border-red-500/30 text-red-500"
                    }`}
                  >
                    {countdownMessage}
                  </div>
                )}
              </div>

              <div className="bg-dark-card border border-border rounded-2xl p-6 card-glow">
                <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
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
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Eşleştirme
                </h2>
                <p className="text-muted-foreground mb-6">
                  Tamamlanmış profilleri ve müsaitlik zamanlarını kullanarak kullanıcıları eşleştir.
                </p>

                <Button
                  onClick={handleRunMatching}
                  disabled={matchingStatus === "running"}
                  className="w-full btn-bilgi mb-4"
                >
                  {matchingStatus === "running" ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Eşleştirme Yapılıyor...
                    </span>
                  ) : (
                    "Eşleştirmeyi Başlat"
                  )}
                </Button>

                {matchingResult && (
                  <div
                    className={`p-4 rounded-lg text-sm ${
                      matchingStatus === "success"
                        ? "bg-green-500/10 border border-green-500/30 text-green-500"
                        : "bg-red-500/10 border border-red-500/30 text-red-500"
                    }`}
                  >
                    {matchingResult}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-dark-card border border-border rounded-2xl p-6 card-glow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold flex items-center gap-2">
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
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                İletişim Mesajları
              </h2>
              <span className="text-xs text-muted-foreground">{formatNumber(unreadMessages)} okunmamış</span>
            </div>

            {messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Henüz mesaj yok.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg border ${
                      msg.is_read ? "bg-dark-bg/50 border-border" : "bg-bilgi-red/5 border-bilgi-red/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium text-foreground">{msg.name}</p>
                        <p className="text-xs text-muted-foreground">{msg.email}</p>
                      </div>
                      {!msg.is_read && (
                        <button onClick={() => markMessageAsRead(msg.id)} className="text-xs text-bilgi-red hover:underline">
                          Okundu
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{msg.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{new Date(msg.created_at).toLocaleString("tr-TR")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
