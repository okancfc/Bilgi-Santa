"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { ADMIN_EMAILS } from "@/lib/constants"
import { StarsBackground } from "@/components/StarsBackground"
import { UserNav } from "@/components/UserNav"
import { Button } from "@/components/ui/button"

interface Stats {
  totalUsers: number
  completedProfiles: number
  totalSlots: number
  totalMatches: number
  unreadMessages: number
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
  const [userName, setUserName] = useState<string>("")
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    completedProfiles: 0,
    totalSlots: 0,
    totalMatches: 0,
    unreadMessages: 0,
  })
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [matchingStatus, setMatchingStatus] = useState<"idle" | "running" | "success" | "error">("idle")
  const [matchingResult, setMatchingResult] = useState<string>("")

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

        // Check if user is admin
        if (!ADMIN_EMAILS.includes(user.email || "")) {
          router.push("/profile")
          return
        }

        setIsAdmin(true)

        // Load user name
        const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", user.id).single()

        if (profile?.name) {
          setUserName(profile.name)
        }

        // Load stats - these queries need admin access in production
        // For now, we'll make individual queries
        const [profilesRes, slotsRes, matchesRes, messagesRes] = await Promise.all([
          supabase.from("profiles").select("id, profile_completed", { count: "exact" }),
          supabase.from("availability_slots").select("id", { count: "exact" }),
          supabase.from("matches").select("id", { count: "exact" }),
          supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
        ])

        const completedProfiles = (profilesRes.data || []).filter((p) => p.profile_completed).length

        setStats({
          totalUsers: profilesRes.count || 0,
          completedProfiles,
          totalSlots: slotsRes.count || 0,
          totalMatches: matchesRes.count || 0,
          unreadMessages: (messagesRes.data || []).filter((m) => !m.is_read).length,
        })

        setMessages((messagesRes.data || []) as ContactMessage[])
      } catch (error) {
        console.error("Error loading admin data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadAdminData()
  }, [router])

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

      // Refresh stats
      const { count } = await supabase.from("matches").select("id", { count: "exact" })

      setStats((prev) => ({ ...prev, totalMatches: count || 0 }))
    } catch (error) {
      setMatchingStatus("error")
      setMatchingResult(error instanceof Error ? error.message : "Eşleştirme başarısız oldu.")
    }
  }

  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase.from("contact_messages").update({ is_read: true }).eq("id", messageId)

      setMessages(messages.map((m) => (m.id === messageId ? { ...m, is_read: true } : m)))
      setStats((prev) => ({ ...prev, unreadMessages: prev.unreadMessages - 1 }))
    } catch (error) {
      console.error("Error marking message as read:", error)
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

  if (!isAdmin) {
    return null
  }

  return (
    <main className="relative min-h-screen">
      <StarsBackground />
      <UserNav userName={userName} />

      <div className="relative z-10 pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl md:text-4xl font-bold gradient-text mb-2">Admin Paneli</h1>
            <p className="text-muted-foreground">Bilgi Santa yönetim paneli</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-dark-card border border-border rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-bilgi-red">{stats.totalUsers}</p>
              <p className="text-sm text-muted-foreground">Toplam Kullanıcı</p>
            </div>
            <div className="bg-dark-card border border-border rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-500">{stats.completedProfiles}</p>
              <p className="text-sm text-muted-foreground">Tamamlanmış Profil</p>
            </div>
            <div className="bg-dark-card border border-border rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-500">{stats.totalSlots}</p>
              <p className="text-sm text-muted-foreground">Müsaitlik Slotu</p>
            </div>
            <div className="bg-dark-card border border-border rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-gold-accent">{stats.totalMatches}</p>
              <p className="text-sm text-muted-foreground">Eşleşme</p>
            </div>
            <div className="bg-dark-card border border-border rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-purple-500">{stats.unreadMessages}</p>
              <p className="text-sm text-muted-foreground">Okunmamış Mesaj</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Matching Control */}
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

            {/* Contact Messages */}
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
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                İletişim Mesajları
              </h2>

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
                          <button
                            onClick={() => markMessageAsRead(msg.id)}
                            className="text-xs text-bilgi-red hover:underline"
                          >
                            Okundu
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{msg.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(msg.created_at).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
