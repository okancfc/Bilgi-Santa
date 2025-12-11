"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type ChatMessage = {
  id: string
  match_id: string
  sender_id: string
  content: string
  created_at: string
}

type ChatResponse = {
  matchId: string | null
  selfId?: string
  messages: ChatMessage[]
  error?: string
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [selfId, setSelfId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isDisabled = useMemo(() => !matchId || loading, [loading, matchId])

  const scrollToBottom = () => {
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }))
  }

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/chat")
      const data = (await res.json()) as ChatResponse
      if (!res.ok) {
        setError(data?.error || "Sohbet yüklenemedi")
        return
      }
      setMatchId(data.matchId)
      setSelfId(data.selfId || null)
      setMessages(data.messages || [])
      setError(null)
      scrollToBottom()
    } catch (e) {
      console.error("Chat fetch error:", e)
      setError("Sohbet yüklenemedi")
    } finally {
      setLoading(false)
    }
  }

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(fetchMessages, 6000)
  }

  useEffect(() => {
    if (open) {
      fetchMessages()
      startPolling()
    } else if (pollRef.current) {
      clearInterval(pollRef.current)
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !matchId) return
    setSending(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || "Mesaj gönderilemedi")
        return
      }

      setInput("")
      await fetchMessages()
    } catch (e) {
      console.error("Chat send error:", e)
      setError("Mesaj gönderilemedi")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="w-14 h-14 rounded-full bg-bilgi-red text-white shadow-lg shadow-bilgi-red/40 flex items-center justify-center hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-gold-accent focus:ring-offset-2 focus:ring-offset-background"
          aria-label="Eşinle sohbet et"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[90vw] max-w-sm bg-dark-card border border-border rounded-2xl shadow-2xl card-glow flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="text-xs text-muted-foreground">Anonim sohbet</p>
              <p className="font-heading font-bold">Eşinle Chat</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Sohbeti kapat"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-96 px-4 py-3 space-y-2 bg-dark-bg/60">
            {loading ? (
              <p className="text-sm text-muted-foreground">Sohbet yükleniyor…</p>
            ) : matchId === null ? (
              <p className="text-sm text-muted-foreground">Önce bir eşleşme al, sonra sohbet başlayacak.</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">İlk mesajı sen gönderebilirsin.</p>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === selfId
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow ${
                        isMine
                          ? "bg-bilgi-red text-white shadow-bilgi-red/40"
                          : "bg-muted text-foreground shadow-black/20"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className="text-[10px] opacity-70 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border px-3 py-2 bg-dark-card/80">
            {error && <p className="text-xs text-red-400 mb-1">{error}</p>}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend()
                }}
                placeholder={isDisabled ? "Eşleşme bekleniyor" : "Mesaj yaz..."}
                className="flex-1 bg-dark-bg border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bilgi-red disabled:opacity-60"
                disabled={isDisabled || sending}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isDisabled || sending || !input.trim()}
                className="bg-bilgi-red text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-md shadow-bilgi-red/30 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-bilgi-red/50"
              >
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
