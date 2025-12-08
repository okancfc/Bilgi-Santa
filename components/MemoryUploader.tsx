"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

interface MemoryItemLite {
  id: string
  user_id: string
}

interface MatchResponse {
  otherProfile: { user_id: string; name: string | null } | null
}

interface MemoryUploaderProps {
  title?: string
  description?: string
}

export function MemoryUploader({ title = "Buluşma Anısı Yükle", description }: MemoryUploaderProps) {
  const [userId, setUserId] = useState<string>("")
  const [partnerId, setPartnerId] = useState<string>("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [memoryCaption, setMemoryCaption] = useState("")
  const [memoryFile, setMemoryFile] = useState<File | null>(null)
  const [uploadingMemory, setUploadingMemory] = useState(false)
  const [checking, setChecking] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const loadUserAndMatch = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const response = await fetch("/api/match")
      if (response.ok) {
        const matchData = (await response.json()) as MatchResponse
        if (matchData.otherProfile?.user_id) {
          setPartnerId(matchData.otherProfile.user_id)
        }
      }
    }
    loadUserAndMatch()
  }, [])

  const hasPairMemory = useMemo(() => {
    // Computed after fetchMemories check
    return false
  }, [])

  const checkPairMemory = async () => {
    if (!userId) return false
    setChecking(true)
    try {
      const response = await fetch("/api/memories")
      if (!response.ok) return false
      const data = (await response.json()) as { items: MemoryItemLite[] }
      const exists = data.items?.some((m) => m.user_id === userId || (partnerId && m.user_id === partnerId))
      return exists
    } catch (error) {
      console.error("Memory check error:", error)
      return false
    } finally {
      setChecking(false)
    }
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

  const handleUploadMemory = async () => {
    if (!memoryFile) {
      setMessage({ type: "error", text: "Lütfen bir fotoğraf seç." })
      return
    }
    if (!userId) {
      setMessage({ type: "error", text: "Oturum bulunamadı. Yeniden giriş yap." })
      return
    }

    const alreadyHas = await checkPairMemory()
    if (alreadyHas) {
      setMessage({ type: "error", text: "Eşleşmeniz için zaten bir fotoğraf yüklendi." })
      return
    }

    setUploadingMemory(true)
    setMessage(null)

    try {
      const compressed = await compressImage(memoryFile)
      const ext = compressed.name.split(".").pop() || "jpg"
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`
      const filePath = `${userId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("memories")
        .upload(filePath, compressed, { cacheControl: "3600", upsert: false, contentType: compressed.type || "image/jpeg" })

      if (uploadError) {
        console.error("Memory upload error:", uploadError)
        setMessage({ type: "error", text: "Fotoğraf yüklenemedi. Supabase 'memories' bucket'ı hazır mı?" })
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
        setMessage({ type: "error", text: "Fotoğraf kaydedilemedi." })
        return
      }

      setMemoryCaption("")
      setMemoryFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setMessage({ type: "success", text: "Anın paylaşıldı! 🎉" })
    } catch (error) {
      console.error("Memory upload flow error:", error)
      setMessage({ type: "error", text: "Fotoğraf yüklenirken bir hata oluştu." })
    } finally {
      setUploadingMemory(false)
    }
  }

  return (
    <div className="bg-dark-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-gold-accent">{title}</p>
        <p className="text-sm text-muted-foreground">
          {description || "Buluşma gününden kareyi yükle, kare formatında Anılar akışında görünsün."}
        </p>
        <p className="text-xs text-muted-foreground">Eşleşme başına tek fotoğraf paylaşılabilir.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Fotoğraf</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors text-foreground text-left"
            >
              {memoryFile ? memoryFile.name : "Fotoğraf Seç"}
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
              disabled={!memoryFile || uploadingMemory || checking}
              onClick={handleUploadMemory}
              className="px-4 py-2 rounded-lg bg-bilgi-red text-white font-semibold shadow hover:shadow-bilgi-red/40 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
