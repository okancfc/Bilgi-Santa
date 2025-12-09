"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase, type Profile, type Match } from "@/lib/supabaseClient"
import { StarsBackground } from "@/components/StarsBackground"
import Link from "next/link"

interface MatchData {
  match: Match
  otherProfile: Profile
}

export default function MatchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [matchData, setMatchData] = useState<MatchData | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    const loadMatch = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          router.push("/login")
          return
        }

        setUser({ id: authUser.id })

        // Fetch match + other profile via server API (bypasses RLS)
        const response = await fetch("/api/match")
        if (!response.ok) {
          console.error("Match API error:", await response.text())
          return
        }

        const data = (await response.json()) as { match: Match | null; otherProfile: Profile | null }
        if (data.match && data.otherProfile) {
          setMatchData({ match: data.match, otherProfile: data.otherProfile })
        }
      } catch (error) {
        console.error("Error loading match:", error)
      } finally {
        setLoading(false)
      }
    }

    loadMatch()

    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [router])

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

  const meetingDateTime = useMemo(() => {
    if (!matchData?.match?.meeting_date || !matchData.match.meeting_start) return null
    const start = matchData.match.meeting_start.length === 5 ? `${matchData.match.meeting_start}:00` : matchData.match.meeting_start
    return new Date(`${matchData.match.meeting_date}T${start}`)
  }, [matchData?.match?.meeting_date, matchData?.match?.meeting_start])

  const revealAt = useMemo(() => {
    if (!meetingDateTime) return null
    return new Date(meetingDateTime.getTime() - 24 * 60 * 60 * 1000)
  }, [meetingDateTime])

  const emailRevealed = revealAt ? now >= revealAt.getTime() : false
  const msUntilReveal = revealAt ? Math.max(0, revealAt.getTime() - now) : null

  const formatCountdown = (ms: number) => {
    const totalMinutes = Math.ceil(ms / 60000)
    const days = Math.floor(totalMinutes / (60 * 24))
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
    const minutes = totalMinutes % 60
    if (days > 0) return `${days} gün ${hours} saat`
    if (hours > 0) return `${hours} saat ${minutes} dk`
    return `${minutes} dk`
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
            <h1 className="font-heading text-3xl md:text-4xl font-bold gradient-text mb-2">Eşleşmen</h1>
            <p className="text-muted-foreground">
              Buluşma detayların, eşinin ilgi alanları ve buluşmadan 24 saat önce e-postası burada.
            </p>
          </div>

          {!matchData ? (
            // No match yet
            <div className="bg-dark-card border border-border rounded-2xl p-8 card-glow text-center">
              <div className="w-20 h-20 rounded-full bg-bilgi-red/10 flex items-center justify-center mx-auto mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-bilgi-red"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h2 className="font-heading text-2xl font-bold mb-3">Eşleşmen Henüz Hazır Değil</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Eşleştirme henüz tamamlanmadı. Profilini ve müsaitlik zamanlarını kontrol ettiğinden emin ol ve daha
                sonra tekrar kontrol et.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/profile"
                  className="px-6 py-3 bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Profilimi Düzenle
                </Link>
                <Link
                  href="/availability"
                  className="px-6 py-3 bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Müsaitlik Ekle
                </Link>
              </div>
            </div>
          ) : (
            // Match found
            <div className="space-y-6">
              {/* Meeting Card */}
              <div className="bg-gradient-to-br from-bilgi-red/20 via-dark-card to-gold-accent/10 border border-bilgi-red/30 rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-bilgi-red/20 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="28"
                      height="28"
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
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Buluşma Kartı</p>
                    <p className="font-heading text-2xl font-bold text-gold-accent">{matchData.match.meeting_code}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-dark-bg/50 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-1">Tarih</p>
                    <p className="font-medium text-foreground">{formatDate(matchData.match.meeting_date)}</p>
                  </div>
                  <div className="bg-dark-bg/50 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-1">Saat</p>
                    <p className="font-medium text-foreground">
                      {formatTime(matchData.match.meeting_start)} - {formatTime(matchData.match.meeting_end)}
                    </p>
                  </div>
                  <div className="bg-dark-bg/50 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-1">Yer</p>
                    <p className="font-medium text-foreground">{matchData.match.meeting_location || "Belirtilmedi"}</p>
                  </div>
                </div>

                <div className="bg-gold-accent/10 border border-gold-accent/30 rounded-lg p-4">
                  <p className="text-gold-accent text-sm font-medium flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" x2="12" y1="8" y2="12" />
                      <line x1="12" x2="12.01" y1="16" y2="16" />
                    </svg>
                    Bu kodu buluşma sırasında kullanarak birbirinizi bulabilirsiniz!
                  </p>
                </div>
              </div>

              {/* Partner Info Card */}
              <div className="bg-dark-card border border-border rounded-2xl p-6 md:p-8 card-glow">
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
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                  Eşinin İlgi Alanları
                </h2>

                <div className="bg-dark-bg/60 border border-border rounded-lg p-4 mb-6">
                  <p className="text-xs text-muted-foreground mb-1">İletişim için e-posta</p>
                  {emailRevealed ? (
                    <p className="font-medium">{matchData.otherProfile.email || "E-posta bulunamadı"}</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-medium text-gold-accent">
                        {msUntilReveal !== null
                          ? `E-posta ${formatCountdown(msUntilReveal)} sonra açılacak`
                          : "E-posta için zaman bilgisi bekleniyor"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Buluşmadan 24 saat önce e-posta adresi burada görünecek.
                      </p>
                    </div>
                  )}
                </div>

                {matchData.otherProfile.interests && matchData.otherProfile.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {matchData.otherProfile.interests.map((interest) => (
                      <span
                        key={interest}
                        className="px-4 py-2 bg-bilgi-red/10 text-bilgi-red rounded-full text-sm border border-bilgi-red/30"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground mb-6">İlgi alanları belirtilmemiş.</p>
                )}

                {matchData.otherProfile.gift_preferences && (
                  <>
                    <h3 className="font-heading font-bold mb-3 flex items-center gap-2">
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
                        className="text-gold-accent"
                      >
                        <rect x="3" y="8" width="18" height="4" rx="1" />
                        <path d="M12 8v13" />
                        <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
                        <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
                      </svg>
                      Hediye Tercihleri
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {matchData.otherProfile.gift_preferences.split(",").map((pref) => (
                        <span
                          key={pref.trim()}
                          className="px-3 py-1 bg-gold-accent/10 text-gold-accent rounded-full text-sm border border-gold-accent/30"
                        >
                          {pref.trim()}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {matchData.otherProfile.about_me && (
                  <>
                    <h3 className="font-heading font-bold mb-3">Hakkında</h3>
                    <p className="text-muted-foreground bg-dark-bg rounded-lg p-4 italic">
                      &quot;{matchData.otherProfile.about_me}&quot;
                    </p>
                  </>
                )}
              </div>

              {/* Tips Card */}
              <div className="bg-dark-card border border-border rounded-2xl p-6 card-glow">
                <h3 className="font-heading font-bold mb-4">Buluşma İpuçları</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-bilgi-red/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-bilgi-red text-xs font-bold">1</span>
                    </span>
                    Belirlenen saatte buluşma noktasında ol.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-bilgi-red/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-bilgi-red text-xs font-bold">2</span>
                    </span>
                    Buluşma kodunu kullanarak birbirinizi bulun.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-bilgi-red/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-bilgi-red text-xs font-bold">3</span>
                    </span>
                    Hediye tercihlerine uygun, düşünceli bir hediye hazırla.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-bilgi-red/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-bilgi-red text-xs font-bold">4</span>
                    </span>
                    Rahat ol ve yeni arkadaşlığın tadını çıkar!
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
