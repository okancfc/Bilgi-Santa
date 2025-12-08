"use client"

import type { CSSProperties } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { StarsBackground } from "@/components/StarsBackground"
import { UserNav } from "@/components/UserNav"

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
  const [memoryMessage, setMemoryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [memoryCaption, setMemoryCaption] = useState("")
  const [memoryFile, setMemoryFile] = useState<File | null>(null)
  const [uploadingMemory, setUploadingMemory] = useState(false)
  const [now, setNow] = useState<number>(() => Date.now())
  const [lightbox, setLightbox] = useState<{ url: string; caption?: string | null; user_name?: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
    if (!loading) {
      fetchMemories()
    }
  }, [loading])

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
    <main className="relative min-h-screen">
      <StarsBackground />
      <UserNav userName={userName} />

      <div className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Upload form kaldırıldı - artık Anasayfa ve Profil üzerinden yükleniyor */}

          <div className="">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wide text-gold-accent">Keşfet</p>
              <h3 className="font-heading text-xl font-bold">Anı Akışı</h3>
            </div>

            {memoriesLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <span className="sr-only">Anılar yükleniyor...</span>
                <div className="animate-spin w-8 h-8 border-2 border-bilgi-red border-t-transparent rounded-full" />
              </div>
            ) : memories.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground">
                Henüz paylaşım yok. İlk fotoğrafı sen yükle!
              </div>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto no-scrollbar" style={scrollContainerStyle}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10 sm:gap-6">
                  {memories.map((memory) => (
                    <div
                      key={memory.id}
                      className="relative group overflow-hidden rounded-xl border border-border bg-dark-bg/60"
                    >
                      <div
                        className="aspect-square w-full overflow-hidden cursor-zoom-in"
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setLightbox({ url: memory.image_url, caption: memory.caption, user_name: getDisplayName(memory) })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setLightbox({ url: memory.image_url, caption: memory.caption, user_name: getDisplayName(memory) })
                          }
                        }}
                      >
                        <img
                          src={memory.image_url}
                          alt={memory.caption || "Buluşma anısı"}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-2">
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-semibold text-white truncate">{getDisplayName(memory)}</p>
                          {memory.caption && <p className="text-xs text-gray-200 line-clamp-2 break-words">{memory.caption}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleLike(memory.id)}
                          className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-full border text-sm transition-colors whitespace-nowrap ${
                            memory.liked_by_me
                              ? "bg-bilgi-red/25 border-bilgi-red/20 text-white"
                              : "bg-dark-bg/20 border-border text-white"
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
                          <span className="w-3">{memory.likes_count}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[85vh] bg-dark-card border border-border rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={lightbox.url} alt={lightbox.caption || "Anı"} className="w-full h-full object-contain bg-black" />
            <button
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
              onClick={() => setLightbox(null)}
              aria-label="Kapat"
            >
              ✕
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 space-y-1">
              {lightbox.user_name && <p className="text-sm font-semibold text-white">{lightbox.user_name}</p>}
              {lightbox.caption && <p className="text-xs text-gray-200">{lightbox.caption}</p>}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
