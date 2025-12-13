"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { formatBilgiEmail, BILGI_EMAIL_DOMAIN } from "@/lib/email"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StarsBackground } from "@/components/StarsBackground"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get("redirect") || "/profile"

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const handleEmailChange = (value: string) => {
    const cleaned = value.trim().toLowerCase()

    if (!cleaned) {
      setFormData((prev) => ({ ...prev, email: "" }))
      return
    }

    const normalized = cleaned.includes("@") ? formatBilgiEmail(cleaned) : cleaned
    setFormData((prev) => ({ ...prev, email: normalized }))
  }

  // Check for error from URL params (e.g., failed email confirmation)
  useEffect(() => {
    const verified = searchParams.get("verified")

    if (verified === "true") {
      setStatus("idle")
      setErrorMessage("")
      setSuccessMessage("E-posta adresin doğrulandı. Lütfen giriş yap.")
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("🔑 Login başladı")
    const email = formatBilgiEmail(formData.email)
    console.log("Email:", email)

    if (!email) {
      setStatus("error")
      setErrorMessage(`Lütfen Bilgi e-posta adresinizi yazın. (@bilgiedu.net otomatik eklenecek)`)
      return
    }

    setStatus("loading")
    setErrorMessage("")
    setSuccessMessage("")

    try {
      console.log("📤 Server-side login API çağrılıyor...")
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: formData.password,
        }),
      })

      const result = await response.json()
      console.log("📥 Login API yanıtı:", result)

      if (!response.ok) {
        console.error("❌ Login hatası:", result.error)
        throw new Error(result.error || "Login failed")
      }

      console.log("✅✅✅ LOGIN BAŞARILI! ✅✅✅")
      console.log("👤 Kullanıcı:", result.user?.email)
      console.log("📋 Profile completed:", result.profile_completed)
      
      // Server set the cookies, now redirect
      const targetPath = result.profile_completed ? "/match" : redirectPath
      console.log("🔄 Yönlendiriliyor:", targetPath)
      
      // Full page reload to ensure middleware sees the new session
      window.location.replace(targetPath)
    } catch (error) {
      console.error("💥 Login catch bloğu:", error)
      setStatus("error")
      if (error instanceof Error) {
        console.error("Error message:", error.message)
        if (error.message.includes("Invalid login credentials")) {
          setErrorMessage("E-posta veya şifre hatalı.")
        } else if (error.message.includes("Email not confirmed")) {
          setErrorMessage("E-posta adresiniz henüz doğrulanmamış. Lütfen e-postanızı kontrol edin.")
        } else {
          setErrorMessage(error.message)
        }
      } else {
        setErrorMessage("Giriş sırasında bir hata oluştu.")
      }
    }
    console.log("🏁 Login fonksiyonu tamamlandı")
  }

  const showDomainSuffix = !formData.email.includes("@")

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <StarsBackground />

      <div className="relative z-10 w-full max-w-md">
        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
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
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Ana Sayfa
        </Link>

        <div className="bg-dark-card border border-border rounded-2xl p-8 card-glow">
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl font-bold gradient-text mb-2">Giriş Yap</h1>
            <p className="text-muted-foreground">Bilgi Santa hesabına giriş yap</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email">E-posta</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  value={formData.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  required
                  className={cn(
                    "mt-1 bg-dark-bg border-border",
                    showDomainSuffix ? "pr-32" : "pr-3"
                  )}
                  placeholder="ad.soyad"
                />
                {showDomainSuffix && (
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                    {BILGI_EMAIL_DOMAIN}
                  </span>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="mt-1 bg-dark-bg border-border"
                placeholder="Şifreniz"
              />
            </div>

            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-500 text-sm">{successMessage}</p>
              </div>
            )}

            {status === "error" && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-500 text-sm">{errorMessage}</p>
              </div>
            )}

            <Button type="submit" disabled={status === "loading"} className="w-full btn-bilgi">
              {status === "loading" ? (
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
                  Giriş Yapılıyor...
                </span>
              ) : (
                "Giriş Yap"
              )}
            </Button>

            <p className="text-center text-muted-foreground text-sm">
              Hesabın yok mu?{" "}
              <Link href="/signup" className="text-bilgi-red hover:underline">
                Kayıt Ol
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}
