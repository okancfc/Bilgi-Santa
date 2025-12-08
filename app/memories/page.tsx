"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { StarsBackground } from "@/components/StarsBackground"
import { UserNav } from "@/components/UserNav"

interface MemoryItem {
  id: string
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
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [memoriesLoading, setMemoriesLoading] = useState(false)
  const [memoryMessage, setMemoryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [memoryCaption, setMemoryCaption] = useState("")
  const [memoryFile, setMemoryFile] = useState<File | null>(null)
  const [uploadingMemory, setUploadingMemory] = useState(false)
  const [now, setNow] = useState<number>(() => Date.now())
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
      setUserName(profile?.name || user.email?.split("@")[0] || "Santa")

      setLoading(false)
    }

    loadUser()
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [router])

  const meetingGateText = useMemo(
    () => "Test sürecinde fotoğraf yükleme kısıtı kaldırıldı; buluşma günü sonrası kuralı ileride yeniden açacağız.",
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

  return (
    <main className="relative min-h-screen">
      <StarsBackground />
      <UserNav userName={userName} />

      <div className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-gradient-to-br from-bilgi-red/20 via-dark-card to-gold-accent/15 border border-bilgi-red/40 rounded-3xl p-6 md:p-8 card-glow grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2 space-y-3">
              <p className="text-xs uppercase tracking-wide text-gold-accent">Keşfet</p>
              <h1 className="font-heading text-3xl md:text-4xl font-bold">Buluşma Anıları</h1>
              <p className="text-muted-foreground max-w-2xl">
                Fotoğrafını yükle, kare kartlar halinde keşfet akışına düşsün. Beğenilerle arkadaşlarının anılarını öne çıkar.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="px-3 py-1 rounded-full border border-green-500/40 text-green-400 bg-green-500/10">Yükleme açık</span>
                <span className="text-foreground font-medium">{meetingGateText}</span>
                <button
                  type="button"
                  onClick={fetchMemories}
                  className="text-sm text-gold-accent hover:underline"
                  disabled={memoriesLoading}
                >
                  {memoriesLoading ? "Yükleniyor..." : "Akışı yenile"}
                </button>
              </div>
            </div>
            <div className="w-full bg-dark-bg/70 border border-border rounded-2xl p-4 space-y-3">
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
                    disabled={!memoryFile || uploadingMemory}
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
              <p className="text-xs text-muted-foreground">{meetingGateText}</p>
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

          <div className="bg-dark-card border border-border rounded-3xl p-6 card-glow">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-gold-accent">Akış</p>
                <h3 className="font-heading text-2xl font-bold">Keşfet</h3>
                <p className="text-muted-foreground text-sm">Kare kartlar, yumuşak köşeler ve net overlay ile.</p>
              </div>
            </div>

            {memoriesLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">Anılar yükleniyor...</div>
            ) : memories.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground">
                Henüz paylaşım yok. İlk fotoğrafı sen yükle!
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="relative group overflow-hidden rounded-2xl border border-border bg-dark-bg/60"
                  >
                    <div className="aspect-square w-full overflow-hidden">
                      <img
                        src={memory.image_url}
                        alt={memory.caption || "Buluşma anısı"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-3">
                      <div className="space-y-1 max-w-[70%]">
                        <p className="text-sm font-semibold text-white truncate">{memory.user_name}</p>
                        {memory.caption && <p className="text-xs text-gray-200 line-clamp-2">{memory.caption}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleLike(memory.id)}
                        className={`flex items-center gap-1 px-3 py-2 rounded-full border text-sm transition-colors ${
                          memory.liked_by_me
                            ? "bg-bilgi-red/25 border-bilgi-red/50 text-white"
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
      </div>
    </main>
  )
}
