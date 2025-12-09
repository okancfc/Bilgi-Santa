"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import bilgiSantaLogo from "@/public/bilgi-santa-logo.png"

interface UserNavProps {
  userName?: string | null
}

export function UserNav({ userName }: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      // Clear client session
      await supabase.auth.signOut()
      // Clear server httpOnly cookies
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsOpen(false)
      // Full reload to ensure middleware sees cleared cookies
      window.location.href = "/"
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-bg/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center h-10">
          <Image src={bilgiSantaLogo} alt="Bilgi Santa" priority sizes="160px" className="h-14 md:h-16 lg:h-18 w-auto" />
          <span className="sr-only">Bilgi Santa</span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Anasayfa
            </Link>
            <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
              Profil
            </Link>
            <Link href="/availability" className="text-muted-foreground hover:text-foreground transition-colors">
              Müsaitlik
            </Link>
            <Link href="/match" className="text-muted-foreground hover:text-foreground transition-colors">
              Eşleşme
            </Link>
            <Link href="/memories" className="text-muted-foreground hover:text-foreground transition-colors">
              Anılar
            </Link>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-bilgi-red/20 flex items-center justify-center">
                <span className="text-bilgi-red font-medium text-sm">{userName?.charAt(0)?.toUpperCase() || "U"}</span>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {isOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-dark-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-border">
                    <p className="text-sm font-medium truncate">{userName || "Kullanıcı"}</p>
                  </div>

                  {/* Mobile nav links */}
                  <div className="md:hidden border-b border-border">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Profil
                    </Link>
                    <Link
                      href="/"
                      className="block px-4 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Anasayfa
                    </Link>
                    <Link
                      href="/availability"
                      className="block px-4 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Müsaitlik
                    </Link>
                    <Link
                      href="/match"
                      className="block px-4 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Eşleşme
                    </Link>
                    <Link
                      href="/memories"
                      className="block px-4 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Anılar
                    </Link>
                  </div>

                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-60"
                  >
                    {loggingOut ? "Çıkış Yapılıyor..." : "Çıkış Yap"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
