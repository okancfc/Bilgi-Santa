"use client"

import { useEffect, useState } from "react"
import type React from "react"

import { UserNav } from "@/components/UserNav"
import { supabase } from "@/lib/supabaseClient"
import { ChatWidget } from "@/components/ChatWidget"

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string>("")

  useEffect(() => {
    let isMounted = true

    const loadUserName = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", user.id).single()
        if (!isMounted) return

        const formatted = profile?.name || user.email?.split("@")[0] || "Kullanıcı"
        setUserName(formatted)
      } catch (error) {
        console.error("Navbar user load error:", error)
      }
    }

    loadUserName()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <>
      <UserNav userName={userName} />
      {children}
      <ChatWidget />
    </>
  )
}
