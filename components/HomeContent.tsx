"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { supabase, type Match, type Profile } from "@/lib/supabaseClient"
import { Countdown } from "@/components/Countdown"
import { Hero } from "@/components/Hero"
import { HowWeMeetBanner } from "@/components/HowWeMeetBanner"
import { StepsSection } from "@/components/StepsSection"
import { Footer } from "@/components/Footer"
import { UserNav } from "@/components/UserNav"

type AuthState = "loading" | "guest" | "authed"

interface MatchResponse {
  match: Match | null
  otherProfile: Profile | null
}

interface MemoryItem {
  id: string
  image_url: string
  caption: string | null
  created_at: string
  likes_count: number
  user_name: string
  liked_by_me: boolean
}

export function HomeContent() {
  const [authState, setAuthState] = useState<AuthState>("loading")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [matchData, setMatchData] = useState<MatchResponse | null>(null)
  const [availabilityCount, setAvailabilityCount] = useState<number>(0)
  const [userName, setUserName] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [now, setNow] = useState<number>(() => Date.now())
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [memoriesLoading, setMemoriesLoading] = useState(false)
  const [memoryMessage, setMemoryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [memoryCaption, setMemoryCaption] = useState("")
  const [memoryFile, setMemoryFile] = useState<File | null>(null)
  const [uploadingMemory, setUploadingMemory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

        if (isMounted) setUserId(user.id)

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

  // Test için şu an fotoğraf yükleme her zaman açık (normalde buluşma sonrası açılacak)
  const canUploadMemory = true
  const memoryGateText = "Test için fotoğraf yükleme şu an açık; buluşma günü kuralı geçici olarak devre dışı."

  const fetchMemories = async () => {
    setMemoriesLoading(true)
    try {
      const response = await fetch("/api/memories")
      if (!response.ok) {
        console.error("Memories fetch error:", await response.text())
        setMemoryMessage({ type: "error", text: "Anılar yüklenemedi." })
        return
      }
      const data = (await response.json()) as { items: MemoryItem[] }
      setMemories(data.items || [])
    } catch (error) {
      console.error("Memories load error:", error)
      setMemoryMessage({ type: "error", text: "Anılar yüklenirken bir sorun oluştu." })
    } finally {
      setMemoriesLoading(false)
    }
  }

  useEffect(() => {
    if (authState === "authed") {
      fetchMemories()
    }
  }, [authState])

  const handleUploadMemory = async () => {
    if (!memoryFile) {
      setMemoryMessage({ type: "error", text: "Lütfen bir fotoğraf seç." })
      return
    }
    setUploadingMemory(true)
    setMemoryMessage(null)

    try {
      const ext = memoryFile.name.split(".").pop() || "jpg"
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`
      const filePath = `${userId || "me"}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("memories")
        .upload(filePath, memoryFile, { cacheControl: "3600", upsert: false, contentType: memoryFile.type || "image/jpeg" })

      if (uploadError) {
        console.error("Memory upload error:", uploadError)
        setMemoryMessage({
          type: "error",
          text: "Fotoğraf yüklenemedi. Supabase 'memories' bucket'ı hazır mı?",
        })
        return
      }

      const { data: publicData } = supabase.storage.from("memories").getPublicUrl(filePath)
      const publicUrl = publicData.publicUrl

      const response = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: publicUrl, caption: memoryCaption.trim() }),
      })

      if (!response.ok) {
        console.error("Memory save error:", await response.text())
        setMemoryMessage({ type: "error", text: "Fotoğraf kaydedilemedi." })
        return
      }

      const { item } = (await response.json()) as { item: MemoryItem }
      setMemories((prev) => [item, ...prev])
      setMemoryCaption("")
      setMemoryFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setMemoryMessage({ type: "success", text: "Anın paylaşıldı! 🎉" })
    } catch (error) {
      console.error("Memory upload flow error:", error)
      setMemoryMessage({ type: "error", text: "Fotoğraf yüklenirken bir hata oluştu." })
    } finally {
      setUploadingMemory(false)
    }
  }

  const toggleLike = async (memoryId: string) => {
    const current = memories.find((m) => m.id === memoryId)
    if (!current) return

    const optimistic = { ...current, liked_by_me: !current.liked_by_me, likes_count: current.likes_count + (current.liked_by_me ? -1 : 1) }
    setMemories((prev) => prev.map((m) => (m.id === memoryId ? optimistic : m)))

    try {
      const response = await fetch(`/api/memories/${memoryId}/like`, { method: "POST" })
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const data = (await response.json()) as { liked: boolean; likes_count: number }
      setMemories((prev) =>
        prev.map((m) =>
          m.id === memoryId ? { ...m, liked_by_me: data.liked, likes_count: data.likes_count ?? m.likes_count } : m,
        ),
      )
    } catch (error) {
      console.error("Like toggle error:", error)
      // revert
      setMemories((prev) => prev.map((m) => (m.id === memoryId ? current : m)))
      setMemoryMessage({ type: "error", text: "Beğeni güncellenemedi." })
    }
  }

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
                Süreç buradan devam ediyor. Profilini, müsaitliklerini ve eşleşmeni tek ekrandan takip et.
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
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="bg-gradient-to-r from-bilgi-red/15 via-dark-card to-gold-accent/10 border border-bilgi-red/30 rounded-2xl p-6 card-glow flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-3">
              <p className="text-xs uppercase tracking-wide text-gold-accent">Buluşma Anıları</p>
              <h3 className="font-heading text-2xl font-bold">Buluşma gününden fotoğrafını paylaş</h3>
              <p className="text-muted-foreground">
                Buluşma gününde çektiğin fotoğrafı yükle; anılar herkesin görebileceği keşfet akışında listelensin. Beğenilerle
                arkadaşlarına destek ol!
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className={`px-3 py-1 rounded-full border ${canUploadMemory ? "border-green-500/40 text-green-400" : "border-border"}`}>
                  {canUploadMemory ? "Yükleme açık" : "Buluşma sonrası açılacak"}
                </span>
                <span className="text-foreground font-medium">{memoryGateText}</span>
              </div>
            </div>
            <div className="w-full md:w-80 bg-dark-bg/60 border border-border rounded-xl p-4 space-y-3">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Fotoğraf</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors text-foreground"
                  >
                    Fotoğraf Seç
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setMemoryFile(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    disabled={!memoryFile || uploadingMemory || !canUploadMemory}
                    onClick={handleUploadMemory}
                    className="px-4 py-2 rounded-lg bg-bilgi-red text-white font-semibold shadow-lg shadow-bilgi-red/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingMemory ? "Yükleniyor..." : "Yükle"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {memoryFile ? memoryFile.name : "Henüz fotoğraf seçilmedi"}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Kısa not (opsiyonel)</label>
                <textarea
                  value={memoryCaption}
                  onChange={(e) => setMemoryCaption(e.target.value.slice(0, 200))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-dark-bg border border-border text-sm text-foreground resize-none"
                  placeholder="Günün nasıl geçti?"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Test sürecinde fotoğraf yükleme kısıtı kaldırıldı; normalde buluşma tarihin geçtikten sonra açılacak.
              </p>
            </div>
          </div>

          {memoryMessage && (
            <div
              className={`p-4 rounded-lg ${
                memoryMessage.type === "success"
                  ? "bg-green-500/10 border border-green-500/30 text-green-400"
                  : "bg-red-500/10 border border-red-500/30 text-red-400"
              }`}
            >
              {memoryMessage.text}
            </div>
          )}

          <div className="bg-dark-card border border-border rounded-2xl p-6 card-glow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gold-accent">Keşfet</p>
                <h3 className="font-heading text-xl font-bold">Anı Akışı</h3>
                <p className="text-muted-foreground text-sm">Buluşma gününden kareler burada sıralanır.</p>
              </div>
              <button
                type="button"
                onClick={fetchMemories}
                className="text-sm text-gold-accent hover:underline"
                disabled={memoriesLoading}
              >
                {memoriesLoading ? "Yükleniyor..." : "Yenile"}
              </button>
            </div>

            {memoriesLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">Anılar yükleniyor...</div>
            ) : memories.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground">
                Henüz paylaşım yok. Buluşmandan sonra ilk fotoğrafı sen yükle!
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="relative group overflow-hidden rounded-xl border border-border bg-dark-bg/60"
                  >
                    <img
                      src={memory.image_url}
                      alt={memory.caption || "Buluşma anısı"}
                      className="h-48 w-full object-cover transform transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white">{memory.user_name}</p>
                        {memory.caption && (
                          <p className="text-xs text-gray-200 line-clamp-2">{memory.caption}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleLike(memory.id)}
                        className={`flex items-center gap-1 px-3 py-2 rounded-full border text-sm transition-colors ${
                          memory.liked_by_me
                            ? "bg-bilgi-red/20 border-bilgi-red/50 text-white"
                            : "bg-dark-bg/70 border-border text-white"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill={memory.liked_by_me ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                        </svg>
                        <span>{memory.likes_count}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <HowWeMeetBanner />
      <Footer />
    </>
  )
}
