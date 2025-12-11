"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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
  meetingCode?: string
  messages: ChatMessage[]
  error?: string
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [sending, setSending] = useState(false)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [selfId, setSelfId] = useState<string | null>(null)
  const [chatCode, setChatCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [matchCheckDone, setMatchCheckDone] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const isDisabled = useMemo(() => !matchId || loading, [loading, matchId])
  const getLastSeenKey = useCallback(
    (mId?: string | null, sId?: string | null) => (mId && sId ? `chat:lastSeen:${mId}:${sId}` : null),
    [],
  )

  const readPersistedLastSeen = useCallback(
    (mId?: string | null, sId?: string | null) => {
      const key = getLastSeenKey(mId, sId)
      if (!key) return null
      try {
        return localStorage.getItem(key)
      } catch (err) {
        console.error("Read last seen error:", err)
        return null
      }
    },
    [getLastSeenKey],
  )

  const persistLastSeen = useCallback(
    (messageId: string | null, mId?: string | null, sId?: string | null) => {
      if (!messageId) return
      const key = getLastSeenKey(mId, sId)
      if (!key) return
      try {
        localStorage.setItem(key, messageId)
      } catch (err) {
        console.error("Persist last seen error:", err)
      }
    },
    [getLastSeenKey],
  )

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior })
          return
        }
        endRef.current?.scrollIntoView({ behavior })
      })
    },
    [],
  )

  const fetchMessages = useCallback(async (isInitial = false) => {
    try {
      if (isInitial && !initialLoadDone) setLoading(true)
      const res = await fetch("/api/chat")
      const data = (await res.json()) as ChatResponse
      if (!res.ok) {
        setError(data?.error || "Sohbet yüklenemedi")
        return
      }
      setMatchId(data.matchId)
      setSelfId((prev) => (data.selfId ?? prev ?? null))
      const suffix = data.meetingCode?.split("-")?.[1] || data.meetingCode || null
      setChatCode(suffix)
      setMessages(data.messages || [])

      const latestMsg = data.messages?.[data.messages.length - 1]
      if (latestMsg) {
        const effectiveSelfId = data.selfId ?? selfId
        const effectiveMatchId = data.matchId ?? matchId
        const fromOther = effectiveSelfId ? latestMsg.sender_id !== effectiveSelfId : false
        const storedSeen = readPersistedLastSeen(effectiveMatchId, effectiveSelfId)
        const seenBaseline = lastSeenMessageId || storedSeen
        const isNew = latestMsg.id !== seenBaseline
        if (!open && fromOther && isNew) {
          setHasUnread(true)
        }
        if (open) {
          setLastSeenMessageId(latestMsg.id)
          persistLastSeen(latestMsg.id, effectiveMatchId, effectiveSelfId)
        }
      }

      setError(null)
      setInitialLoadDone(true)
      scrollToBottom()
    } catch (e) {
      console.error("Chat fetch error:", e)
      setError("Sohbet yüklenemedi")
    } finally {
      if (isInitial) setLoading(false)
      setMatchCheckDone(true)
    }
  }, [initialLoadDone, lastSeenMessageId, open, scrollToBottom, selfId])

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(fetchMessages, 6000)
  }, [fetchMessages])

  useEffect(() => {
    // Prefetch to decide button visibility and warm cache
    fetchMessages(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    startPolling()

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [startPolling])

  useEffect(() => {
    if (!matchId || !selfId) return
    const stored = readPersistedLastSeen(matchId, selfId)
    if (stored) {
      setLastSeenMessageId(stored)
    }
  }, [matchId, readPersistedLastSeen, selfId])

  useEffect(() => {
    if (open) {
      scrollToBottom("auto")
      fetchMessages(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (open) {
      if (messages.length > 0) {
        const latestId = messages[messages.length - 1].id
        setLastSeenMessageId(latestId)
        persistLastSeen(latestId, matchId, selfId)
      }
      setHasUnread(false)
    }
  }, [matchId, messages, open, persistLastSeen, selfId])

  useEffect(() => {
    if (!open) return

    const body = document.body
    const html = document.documentElement
    const scrollY = window.scrollY

    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
    }

    body.style.overflow = "hidden"
    body.style.position = "fixed"
    body.style.top = `-${scrollY}px`
    body.style.width = "100%"
    html.style.overflow = "hidden"

    return () => {
      body.style.overflow = previous.bodyOverflow
      body.style.position = previous.bodyPosition
      body.style.top = previous.bodyTop
      body.style.width = previous.bodyWidth
      html.style.overflow = previous.htmlOverflow
      window.scrollTo(0, scrollY)
    }
  }, [open])

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

  if (!matchCheckDone || matchId === null) {
    return null
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="relative flex items-center gap-2 px-4 py-3 rounded-xl bg-bilgi-red text-white shadow-lg shadow-bilgi-red/40 hover:shadow-bilgi-red/50 hover:scale-[1.01] transition-all focus:outline-none focus:ring-2 focus:ring-gold-accent focus:ring-offset-2 focus:ring-offset-background"
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
            className="w-5 h-5"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-sm font-semibold">Sohbet</span>
          {hasUnread && <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-gold-accent border-2 border-bilgi-red shadow" aria-label="Yeni mesaj" />}
        </button>
      </div>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[92vw] max-w-md bg-dark-card border border-border rounded-2xl shadow-2xl card-glow flex flex-col h-[520px] max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="text-xs text-muted-foreground">Anonim sohbet</p>
              <p className="font-heading font-bold">
                {chatCode ? `CHAT-${chatCode}` : "Eşinle Chat"}
              </p>
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

          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 bg-dark-bg/60">
            <div className="sticky top-0 z-10 -mx-4 px-4 pb-2 bg-gradient-to-b from-dark-card to-transparent text-center text-[12px] text-muted-foreground">
              <span className="inline-block rounded-full bg-muted/40 px-3 py-2">
                Lütfen nazik olun. Hakaret, küfür veya aşağılayıcı mesajlar göndermeyin.
              </span>
            </div>
            {loading && !initialLoadDone ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-8 h-8 rounded-full border-2 border-bilgi-red border-t-transparent animate-spin" aria-label="Yükleniyor" />
              </div>
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
                inputMode="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend()
                }}
                placeholder={isDisabled ? "Eşleşme bekleniyor" : "Mesaj yaz..."}
                className="flex-1 bg-dark-bg border border-border rounded-xl px-3 py-2 text-base leading-6 focus:outline-none focus:ring-2 focus:ring-bilgi-red disabled:opacity-60 min-h-[44px]"
                disabled={isDisabled || sending}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isDisabled || sending || !input.trim()}
                className="bg-bilgi-red text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-md shadow-bilgi-red/30 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-bilgi-red/50 min-h-[44px]"
              >
                {sending ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-flex w-4 h-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                    Gönderiliyor
                  </span>
                ) : (
                  "Gönder"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
