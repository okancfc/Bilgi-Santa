"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StarsBackground } from "@/components/StarsBackground"

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const validateEmail = (email: string): boolean => {
    return email.toLowerCase().endsWith("@bilgi.edu.tr")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setErrorMessage("")

    // Validate email domain
    if (!validateEmail(formData.email)) {
      setStatus("error")
      setErrorMessage("Sadece @bilgi.edu.tr uzantılı e-posta adresleri kabul edilmektedir.")
      return
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setStatus("error")
      setErrorMessage("Şifreler eşleşmiyor.")
      return
    }

    // Validate password length
    if (formData.password.length < 6) {
      setStatus("error")
      setErrorMessage("Şifre en az 6 karakter olmalıdır.")
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/profile`,
          data: {
            name: formData.name,
          },
        },
      })

      if (error) {
        throw error
      }

      if (data.user) {
        // Create initial profile
        const { error: profileError } = await supabase.from("profiles").insert({
          user_id: data.user.id,
          name: formData.name,
          email: formData.email,
          is_active: true,
          profile_completed: false,
        })

        if (profileError) {
          console.error("Profile creation error:", profileError)
        }

        setStatus("success")

        // If email confirmation is disabled, redirect directly
        if (data.session) {
          router.push("/profile")
        }
      }
    } catch (error) {
      setStatus("error")
      if (error instanceof Error) {
        if (error.message.includes("already registered")) {
          setErrorMessage("Bu e-posta adresi zaten kayıtlı.")
        } else {
          setErrorMessage(error.message)
        }
      } else {
        setErrorMessage("Kayıt sırasında bir hata oluştu.")
      }
    }
  }

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
            <h1 className="font-heading text-3xl font-bold gradient-text mb-2">Kayıt Ol</h1>
            <p className="text-muted-foreground">Bilgi Santa'ya katılmak için kayıt ol</p>
          </div>

          {status === "success" ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-500"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-foreground font-medium mb-2">Kayıt Başarılı!</p>
              <p className="text-muted-foreground text-sm">
                E-posta adresinize bir doğrulama bağlantısı gönderdik. Lütfen e-postanızı kontrol edin ve hesabınızı
                doğrulayın.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="name">İsim</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1 bg-dark-bg border-border"
                  placeholder="Adınız Soyadınız"
                />
              </div>

              <div>
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="mt-1 bg-dark-bg border-border"
                  placeholder="ogrenci@bilgi.edu.tr"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Sadece @bilgi.edu.tr uzantılı adresler kabul edilir.
                </p>
              </div>

              <div>
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="mt-1 bg-dark-bg border-border"
                  placeholder="En az 6 karakter"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  className="mt-1 bg-dark-bg border-border"
                  placeholder="Şifrenizi tekrar girin"
                />
              </div>

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
                    Kayıt Yapılıyor...
                  </span>
                ) : (
                  "Kayıt Ol"
                )}
              </Button>

              <p className="text-center text-muted-foreground text-sm">
                Zaten hesabın var mı?{" "}
                <Link href="/login" className="text-bilgi-red hover:underline">
                  Giriş Yap
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
