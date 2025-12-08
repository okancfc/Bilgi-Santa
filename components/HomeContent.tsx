"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase, type Match, type Profile } from "@/lib/supabaseClient"
import { Countdown } from "@/components/Countdown"
import { Hero } from "@/components/Hero"
import { HowWeMeetBanner } from "@/components/HowWeMeetBanner"
import { StepsSection } from "@/components/StepsSection"
import { Footer } from "@/components/Footer"
import { UserNav } from "@/components/UserNav"
import { MemoryUploader } from "@/components/MemoryUploader"

type AuthState = "loading" | "guest" | "authed"

interface MatchResponse {
  match: Match | null
  otherProfile: Profile | null
}

export function HomeContent() {
  const [authState, setAuthState] = useState<AuthState>("loading")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [matchData, setMatchData] = useState<MatchResponse | null>(null)
  const [availabilityCount, setAvailabilityCount] = useState<number>(0)
  const [userName, setUserName] = useState<string>("")
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          if (isMounted) setAuthState("guest")
          return
        }

        const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", user.id).single()
        if (isMounted && profileData) {
          setProfile(profileData)
          setUserName(profileData.name || "")
        } else if (isMounted) {
          setUserName(user.email?.split("@")[0] || "")
        }

        const { data: slots } = await supabase.from("availability_slots").select("id").eq("user_id", user.id)
        if (isMounted) {
          setAvailabilityCount(slots?.length || 0)
        }

        const response = await fetch("/api/match")
        if (response.ok) {
          const matchResponse = (await response.json()) as MatchResponse
          if (isMounted) {
            setMatchData(matchResponse)
          }
        }

        if (isMounted) setAuthState("authed")
      } catch (error) {
        console.error("Home data load error:", error)
        if (isMounted) setAuthState("guest")
      }
    }

    loadData()

    const interval = setInterval(() => setNow(Date.now()), 60000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const formattedUserName = useMemo(() => {
    if (userName) return userName
    if (profile?.name) return profile.name
    return "Santa"
  }, [profile?.name, userName])

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Tarih bekleniyor"
    const date = new Date(dateStr)
    return date.toLocaleDateString("tr-TR", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
  }

  const formatTimeRange = (start?: string | null, end?: string | null) => {
    if (!start || !end) return "Saat bilgisi bekleniyor"
    return `${start.substring(0, 5)} - ${end.substring(0, 5)}`
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

  const memoryGateText = "Anılarını paylaşmak için yeni Anılar sayfasını kullanabilirsin."

  if (authState === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-bilgi-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (authState === "guest") {
    return (
      <>
        <Hero />
        <Countdown />
        <StepsSection />
        <HowWeMeetBanner />
        <Footer />
      </>
    )
  }

  return (
    <>
      <UserNav userName={formattedUserName} />

      <section className="pt-24 pb-10 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="bg-gradient-to-r from-bilgi-red/20 via-dark-card to-gold-accent/10 border border-bilgi-red/40 rounded-2xl p-6 md:p-8 card-glow flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-gold-accent mb-1">Hoş geldin</p>
              <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">{formattedUserName}!</h1>
              <p className="text-muted-foreground">
                Süreç buradan devam ediyor. Profilini, müsaitliklerini ve eşleşmeni tek ekrandan takip et; buluşmadan sonra
                Anılar sayfasına fotoğraf yüklemeyi unutma.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/profile"
                className="px-4 py-3 rounded-xl bg-bilgi-red text-white font-medium shadow-lg shadow-bilgi-red/30 hover:shadow-bilgi-red/40 transition-all"
              >
                Profilim
              </Link>
              <Link
                href="/availability"
                className="px-4 py-3 rounded-xl border border-border bg-dark-bg hover:bg-secondary transition-colors"
              >
                Müsaitliklerim
              </Link>
              <Link
                href="/match"
                className="px-4 py-3 rounded-xl border border-gold-accent/40 bg-gold-accent/10 text-gold-accent hover:bg-gold-accent/20 transition-colors"
              >
                Eşleşmem
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-dark-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Profil Durumu</p>
                <span className="w-8 h-8 rounded-full bg-bilgi-red/15 flex items-center justify-center text-bilgi-red font-semibold">
                  ✓
                </span>
              </div>
              <p className="font-heading text-xl font-bold mb-1">
                {profile?.profile_completed ? "Tamamlandı" : "Eksik Alan Var"}
              </p>
              <p className="text-muted-foreground text-sm">
                {profile?.profile_completed
                  ? "Profilin eşleştirme için hazır."
                  : "Profilini tamamlayıp hediye tercihlerini ekle."}
              </p>
            </div>

            <div className="bg-dark-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Müsaitlik</p>
                <span className="w-8 h-8 rounded-full bg-gold-accent/15 flex items-center justify-center text-gold-accent font-semibold">
                  {availabilityCount}
                </span>
              </div>
              <p className="font-heading text-xl font-bold mb-1">Buluşma Slotu</p>
              <p className="text-muted-foreground text-sm">
                En az bir slot ekli olduğundan emin ol. Yeni bir zaman eklemek için sağdaki butona tıkla.
              </p>
            </div>

            <div className="bg-dark-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Eşleşme</p>
                <span className="w-8 h-8 rounded-full bg-bilgi-red/15 flex items-center justify-center text-bilgi-red font-semibold">
                  {!matchData?.match ? "…" : "#"}
                </span>
              </div>
              <p className="font-heading text-xl font-bold mb-1">
                {matchData?.match ? "Eşleşmen Hazır" : "Beklemede"}
              </p>
              <p className="text-muted-foreground text-sm">
                {matchData?.match ? "Buluşma detaylarını aşağıda görebilirsin." : "Eşleştirme başladığında burada gözükecek."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Countdown />

      <section className="pb-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-dark-card border border-border rounded-2xl p-6 card-glow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold flex items-center gap-2">
                <span className="w-9 h-9 rounded-full bg-bilgi-red/15 flex items-center justify-center text-bilgi-red">🎁</span>
                Eşleşme Kartın
              </h2>
              <Link href="/match" className="text-sm text-gold-accent hover:underline">
                Detayları gör
              </Link>
            </div>

            {!matchData?.match ? (
              <div className="bg-secondary/50 border border-border rounded-xl p-4 text-muted-foreground">
                Henüz eşleşmen yok. Eşleştirme tamamlandığında buluşma kodun ve detayların burada görünecek.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-dark-bg/60 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Tarih</p>
                    <p className="font-medium">{formatDate(matchData.match.meeting_date)}</p>
                  </div>
                  <div className="bg-dark-bg/60 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Saat</p>
                    <p className="font-medium">
                      {formatTimeRange(matchData.match.meeting_start, matchData.match.meeting_end)}
                    </p>
                  </div>
                  <div className="bg-dark-bg/60 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Buluşma Kodu</p>
                    <p className="font-heading font-bold text-gold-accent text-lg">
                      {matchData.match.meeting_code}
                    </p>
                  </div>
                </div>

              <div className="bg-bilgi-red/10 border border-bilgi-red/30 rounded-lg p-3">
                <p className="text-sm text-bilgi-red font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-bilgi-red/20 flex items-center justify-center text-xs font-bold">
                    !
                  </span>
                  Eşin: Anonim Santa
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Buluşma günü fotoğraf çekip Anılar sayfasına yüklemeyi unutma, ikiniz için tek kare paylaşılabilir.
                </p>
                {matchData.otherProfile?.interests?.length ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {matchData.otherProfile.interests.slice(0, 4).map((interest) => (
                      <span
                        key={interest}
                          className="px-3 py-1 bg-dark-bg rounded-full text-xs border border-bilgi-red/30 text-muted-foreground"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">İlgi alanları henüz eklenmemiş.</p>
                  )}
                </div>

                <div className="bg-dark-bg/60 border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">İletişim için e-posta</p>
                  {emailRevealed ? (
                    <p className="font-medium">
                      {matchData.otherProfile?.email || "E-posta bulunamadı"}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-medium text-gold-accent">
                        {msUntilReveal !== null ? `E-posta ${formatCountdown(msUntilReveal)} sonra açılacak` : "E-posta için zaman bilgisi bekleniyor"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Buluşmadan 24 saat önce eşleştiğin kişinin e-postasını görebileceksin.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-dark-card border border-border rounded-2xl p-6 card-glow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold flex items-center gap-2">
                <span className="w-9 h-9 rounded-full bg-gold-accent/15 flex items-center justify-center text-gold-accent">
                  ✨
                </span>
                Profil Özetin
              </h2>
              <Link href="/profile" className="text-sm text-gold-accent hover:underline">
                Güncelle
              </Link>
            </div>

            {!profile ? (
              <div className="bg-secondary/50 border border-border rounded-xl p-4 text-muted-foreground">
                Profilini doldur, buradan özetini takip et.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-dark-bg/60 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Bölüm</p>
                    <p className="font-medium">{profile.department || "Belirtilmedi"}</p>
                  </div>
                  <div className="bg-dark-bg/60 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Sınıf</p>
                    <p className="font-medium">{profile.class_year || "?"}</p>
                  </div>
                </div>

                <div className="bg-dark-bg/60 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-2">İlgi Alanları</p>
                  {profile.interests?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.slice(0, 6).map((interest) => (
                        <span
                          key={interest}
                          className="px-3 py-1 rounded-full bg-bilgi-red/10 text-bilgi-red text-xs border border-bilgi-red/30"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">İlgi alanı eklenmemiş.</p>
                  )}
                </div>

                <div className="bg-dark-bg/60 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Hediye Tercihleri</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.gift_preferences || "Henüz eklenmedi. Eşinin işine yarayacak ipuçları ekleyebilirsin."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-bilgi-red/20 via-dark-card to-gold-accent/15 border border-bilgi-red/40 rounded-3xl p-6 md:p-8 card-glow flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-gold-accent">Anılarını Paylaş</p>
              <h3 className="font-heading text-2xl md:text-3xl font-bold">Buluşma fotoğraflarını Anılar sekmesinden yükle</h3>
              <p className="text-muted-foreground">
                Fotoğraflar kare kartlar olarak keşfet akışında listelenir; beğeni alabilir, arkadaşlarının anılarını görebilirsin.
              </p>
              <p className="text-sm text-gold-accent">{memoryGateText}</p>
            </div>
            <Link
              href="/memories"
              className="px-5 py-3 rounded-xl bg-bilgi-red text-white font-semibold shadow-lg shadow-bilgi-red/30 hover:shadow-bilgi-red/50 transition-all"
            >
              Anılar Sayfasına Git
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <MemoryUploader
            title="Anını Yükle"
            description="Buluşma saatinden sonra eşleşmenle tek kare paylaşabilirsin; kare formatında yükle."
          />
        </div>
      </section>

      <HowWeMeetBanner />
      <Footer />
    </>
  )
}
