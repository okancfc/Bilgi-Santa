"use client"

import type { CSSProperties } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { StarsBackground } from "@/components/StarsBackground"

interface MemoryItem {
  id: string
  user_id: string
  image_url: string
  caption: string | null
  created_at: string
  likes_count: number
  user_name: string
  liked_by_me: boolean
}

export default function MemoriesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [partnerId, setPartnerId] = useState<string>("")
  const [partnerName, setPartnerName] = useState<string>("")
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [memoriesLoading, setMemoriesLoading] = useState(false)
  const [fetchingMore, setFetchingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [showSwipeHint, setShowSwipeHint] = useState(false)
  const [memoryMessage, setMemoryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [memoryCaption, setMemoryCaption] = useState("")
  const [memoryFile, setMemoryFile] = useState<File | null>(null)
  const [uploadingMemory, setUploadingMemory] = useState(false)
  const [now, setNow] = useState<number>(() => Date.now())
  const [fitImages, setFitImages] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const loaderRef = useRef<HTMLDivElement | null>(null)

  const firstName = (name?: string | null) => {
    if (!name) return "Anonim"
    return name.trim().split(/\s+/)[0]
  }

  const scrollContainerStyle: CSSProperties = {
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  }

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      setUserId(user.id)

      const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", user.id).single()
      setUserName(firstName(profile?.name || user.email?.split("@")[0] || "Santa"))

      // match için partner bilgisi
      const matchResponse = await fetch("/api/match")
      if (matchResponse.ok) {
        const matchData = (await matchResponse.json()) as { otherProfile: { user_id: string; name: string | null } | null }
        if (matchData?.otherProfile) {
          setPartnerId(matchData.otherProfile.user_id)
          setPartnerName(firstName(matchData.otherProfile.name || "Eşin"))
        }
      }

      setLoading(false)
    }

    loadUser()
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [router])

  const meetingGateText = useMemo(
    () => "Test sürecinde fotoğraf yükleme kısıtı kaldırıldı; ileride buluşma sonrası kuralı yeniden açacağız.",
    [],
  )

  const fetchMemories = async (cursor?: string, append = false) => {
    if (append && fetchingMore) return

    if (append) {
      setFetchingMore(true)
    } else {
      setMemoriesLoading(true)
      setMemoryMessage(null)
    }

    try {
      const query = cursor ? `/api/memories?cursor=${encodeURIComponent(cursor)}` : "/api/memories"
      const response = await fetch(query)
      if (!response.ok) {
        console.error("Memories fetch error:", await response.text())
        setMemoryMessage({ type: "error", text: "Anılar yüklenemedi." })
        return
      }
      const data = (await response.json()) as { items: MemoryItem[]; nextCursor?: string | null }
      setNextCursor(data.nextCursor ?? null)
      setShowSwipeHint((prev) => prev || (!append && (data.items?.length || 0) > 1))
      setMemories((prev) => {
        if (!append) return data.items || []
        const existingIds = new Set(prev.map((m) => m.id))
        const newItems = (data.items || []).filter((m) => !existingIds.has(m.id))
        return [...prev, ...newItems]
      })
    } catch (error) {
      console.error("Memories load error:", error)
      setMemoryMessage({ type: "error", text: "Anılar yüklenirken bir sorun oluştu." })
    } finally {
      if (append) {
        setFetchingMore(false)
      } else {
        setMemoriesLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!loading) {
      fetchMemories()
    }
  }, [loading])

  useEffect(() => {
    const loaderEl = loaderRef.current
    const rootEl = listRef.current

    if (!loaderEl || !rootEl) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && nextCursor && !memoriesLoading && !fetchingMore) {
            fetchMemories(nextCursor, true)
          }
        })
      },
      { root: rootEl, rootMargin: "200px 0px 200px 0px", threshold: 0.1 },
    )

    observer.observe(loaderEl)

    return () => observer.disconnect()
  }, [nextCursor, memoriesLoading, fetchingMore])

  useEffect(() => {
    const el = listRef.current
    if (!el || !showSwipeHint) return

    const handleScroll = () => {
      if (el.scrollTop > 10) {
        setShowSwipeHint(false)
        el.removeEventListener("scroll", handleScroll)
      }
    }

    el.addEventListener("scroll", handleScroll)
    return () => el.removeEventListener("scroll", handleScroll)
  }, [showSwipeHint])

  const hasPairMemory = useMemo(() => {
    if (!userId) return false
    return memories.some((m) => m.user_id === userId || (partnerId && m.user_id === partnerId))
  }, [memories, partnerId, userId])

  const pairDisplayName = useMemo(() => {
    if (!partnerName) return userName || "Anonim"
    return `${userName || "Sen"} & ${partnerName}`
  }, [partnerName, userName])

  const handleUploadMemory = async () => {
    if (!memoryFile) {
      setMemoryMessage({ type: "error", text: "Lütfen bir fotoğraf seç." })
      return
    }
    if (hasPairMemory) {
      setMemoryMessage({ type: "error", text: "Eşleşmeniz için zaten bir fotoğraf yüklendi." })
      return
    }

    setUploadingMemory(true)
    setMemoryMessage(null)

    try {
      const compressed = await compressImage(memoryFile)
      const ext = compressed.name.split(".").pop() || "jpg"
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`
      const filePath = `${userId || "me"}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("memories")
        .upload(filePath, compressed, {
          cacheControl: "3600",
          upsert: false,
          contentType: compressed.type || "image/jpeg",
        })

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
      setMemories((prev) => prev.map((m) => (m.id === memoryId ? current : m)))
      setMemoryMessage({ type: "error", text: "Beğeni güncellenemedi." })
    }
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

  const getDisplayName = (memory: MemoryItem) => {
    if (!userId) return memory.user_name
    if (memory.user_id === userId || (partnerId && memory.user_id === partnerId)) {
      return pairDisplayName
    }
    return memory.user_name
  }

  const compressImage = async (file: File): Promise<File> => {
    const imageBitmap = await createImageBitmap(file)
    const maxSize = 1280
    let { width, height } = imageBitmap
    if (width > height && width > maxSize) {
      height = Math.round((height * maxSize) / width)
      width = maxSize
    } else if (height > maxSize) {
      width = Math.round((width * maxSize) / height)
      height = maxSize
    }

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(imageBitmap, 0, 0, width, height)
    }

    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.8),
    )

    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
  }

  return (
    <main className="relative min-h-screen flex flex-col">
      <StarsBackground />

      <div className="relative z-10 flex-1">
        {/* Upload form kaldırıldı - artık Anasayfa ve Profil üzerinden yükleniyor */}

        {memoriesLoading ? (
          <div className="mt-16 h-[calc(100dvh-4rem)] flex items-center justify-center text-muted-foreground">
            <span className="sr-only">Anılar yükleniyor...</span>
            <div className="animate-spin w-8 h-8 border-2 border-bilgi-red border-t-transparent rounded-full" />
          </div>
        ) : memories.length === 0 ? (
          <div className="mt-16 h-[calc(100dvh-4rem)] px-6 flex items-center justify-center">
            <div className="max-w-md w-full text-center bg-gradient-to-b from-dark-card/80 to-dark-bg/80 border border-border rounded-3xl shadow-xl px-6 py-10 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-bilgi-red/15 text-bilgi-red flex items-center justify-center text-2xl">
                📸
              </div>
              <h3 className="font-heading text-2xl font-bold text-white">Henüz anı yok</h3>
              <p className="text-muted-foreground">
                Buluşma fotoğrafınızı yükledikçe burada tam ekran görünecek. İlk anıyı sen ekle ve akışı başlat!
              </p>
            </div>
          </div>
        ) : (
          <div
            className="mt-16 h-[calc(100dvh-4rem)] overflow-y-auto snap-y snap-mandatory no-scrollbar"
            style={scrollContainerStyle}
            ref={listRef}
          >
            {memories.map((memory) => {
              const isFitted = fitImages[memory.id]
              return (
              <div
                key={memory.id}
                className="snap-start snap-always h-[calc(100dvh-4rem)] relative group"
              >
                <img
                  src={memory.image_url}
                  alt={memory.caption || "Buluşma anısı"}
                  className={`w-full h-full ${isFitted ? "object-contain bg-black" : "object-cover"}`}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/80 pointer-events-none" />
                <div className="absolute top-4 right-4 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFitImages((prev) => ({ ...prev, [memory.id]: !isFitted }))
                    }}
                    className="w-11 h-11 rounded-full bg-black/60 text-white border border-border hover:bg-black/70 transition-colors flex items-center justify-center"
                    aria-label={isFitted ? "Kırp" : "Sığdır"}
                  >
                    {isFitted ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="7" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="7" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-base font-semibold text-white truncate">{getDisplayName(memory)}</p>
                    {memory.caption && <p className="text-sm text-gray-200 line-clamp-2 break-words">{memory.caption}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLike(memory.id)
                    }}
                    className={`flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-full border text-sm transition-colors whitespace-nowrap ${
                      memory.liked_by_me ? "bg-bilgi-red/25 border-bilgi-red/20 text-white" : "bg-black/40 border-border text-white"
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
                    <span className="w-3 text-center">{memory.likes_count}</span>
                  </button>
                </div>
              </div>
            )})}

            {nextCursor && (
              <div ref={loaderRef} className="h-12 flex items-center justify-center text-muted-foreground">
                {fetchingMore && (
                  <div className="animate-spin w-7 h-7 border-2 border-bilgi-red border-t-transparent rounded-full" />
                )}
              </div>
            )}

            {showSwipeHint && (
              <div className="pointer-events-none absolute inset-x-0 bottom-10 flex flex-col items-center gap-2 text-white drop-shadow">
                <div className="px-3 py-1 rounded-full bg-black/60 text-xs uppercase tracking-wide">Swipe</div>
                <svg
                  className="w-6 h-6 animate-bounce"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25 12 15.75 4.5 8.25" />
                </svg>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
