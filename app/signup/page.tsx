"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { BILGI_EMAIL_DOMAIN, formatBilgiEmail } from "@/lib/email"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StarsBackground } from "@/components/StarsBackground"

const LIABILITY_SECTIONS = [
  {
    title: "1. Platformun Rolü ve Kapsamı",
    points: [
      "Bilgi Santa, kullanıcıların rastgele eşleşerek hediyeleşmesini ve iletişim kurmasını sağlayan gönüllü bir topluluk platformudur.",
      "Platform; etkinlik düzenleme, buluşma planlama, hediye temini, kargo, ödeme veya lojistik süreçlerinin hiçbirinden sorumlu değildir.",
      "Platform yalnızca teknik eşleşme ve temel iletişim altyapısı sağlar; kullanıcılar arasındaki ilişkilere müdahil değildir.",
    ],
  },
  {
    title: "2. Kullanıcı Beyanları ve Yükümlülükleri",
    points: [
      "Hesabı kendi adınıza ve doğru bilgilerle oluşturduğunuzu kabul edersiniz.",
      "Üniversite e-posta adresinizi doğru şekilde beyan ettiğinizi kabul edersiniz.",
      "Paylaştığınız tüm içeriklerden (fotoğraf, mesaj, hediye önerisi vb.) hukuki olarak yalnızca siz sorumlusunuz.",
      "Telif, kişilik hakkı, KVKK ve diğer yasal ihlallerden doğabilecek tüm riski üstlenirsiniz.",
    ],
  },
  {
    title: "2.1 Yasaklı içerik ve davranışlar",
    points: [
      "Yasa dışı, hakaret içeren, saldırgan, cinsel, tehditkâr veya rahatsız edici içerikler paylaşmazsınız.",
      "Alkol, tütün, uyuşturucu kullanımını teşvik eden paylaşımlar yapmazsınız.",
      "Spam, reklam veya ticari amaçlı mesajlar göndermezsiniz.",
      "İhlal halinde hesabınız uyarı yapılmaksızın kısıtlanabilir veya kapatılabilir.",
    ],
  },
  {
    title: "3. Buluşma ve Hediyeleşme Süreçlerine İlişkin Sorumluluk Reddi",
    points: [
      "Buluşma yeri ve zamanının seçimi, güvenlik, ulaşım, teslimat ve kargo süreçleri tamamen sizin sorumluluğunuzdadır.",
      "Olası kayıp, çalıntı, gecikme, kaza, yaralanma veya memnuniyetsizliklerden platform sorumlu tutulamaz.",
      "Platform ödeme/tahsilat aracı değildir; hediyeleşme ve alışveriş süreçlerinde oluşabilecek masraf, vergi veya anlaşmazlıklar kullanıcılara aittir.",
      "Platform kullanıcılar arasındaki uyuşmazlıklarda arabulucu veya garantör değildir.",
    ],
  },
  {
    title: "4. Fotoğraf, Mesaj ve Diğer İçeriklere Yönelik Sorumluluk",
    points: [
      "Paylaştığınız tüm içerikler için gerekli izinlere sahip olduğunuzu ve üçüncü kişilerin haklarını ihlal etmediğinizi beyan edersiniz.",
      "Şikayet veya ihlal şüphesinde içerikler kaldırılabilir, hesap kısıtlanabilir ve gerekli hallerde ilgili mercilere bildirim yapılabilir.",
      "Veri depolama, barındırma veya iletim sırasında yaşanabilecek kesinti, kayıp veya hasarlardan platform sorumlu değildir.",
    ],
  },
  {
    title: "5. Kişisel Verilerin İşlenmesi ve İletişim (KVKK)",
    points: [
      "İşlenen Veriler: Ad-soyad, üniversite e-posta adresi, mesaj içerikleri, profil bilgileri, eşleşme tercihleri, teknik kayıtlar (IP, log bilgileri).",
      "İşleme Amaçları: Eşleşme sürecinin yürütülmesi; kullanıcı doğrulaması; bilgilendirme, duyuru ve güvenlik süreçleri; platformun geliştirilmesi ve güvenliğinin sağlanması.",
      "Aktarım ve Saklama: Veriler Supabase altyapısında saklanır; makul teknik ve idari tedbirler alınsa da %100 güvenlik garanti edilemez, veri sızıntısı, saldırı veya yetkisiz erişim durumlarında platform sorumlu tutulamaz.",
      "Açık Rıza: E-posta adresiniz, etkinlik duyuruları ve bilgilendirme içerikleri için kullanılabilir.",
    ],
  },
  {
    title: "6. Sorumluluk Reddi ve Feragat",
    points: [
      "Platform ve geliştiricileri; doğrudan veya dolaylı zararlar, veri kaybı, kar kaybı, kişisel yaralanma, üçüncü kişi talepleri ve benzeri sonuçlardan hiçbir şekilde sorumlu değildir.",
      "Hizmet kesintisi, bakım, güncelleme veya teknik sorunlar nedeniyle erişimin sınırlanması durumunda oluşabilecek kayıplar için tazmin yükümlülüğü yoktur.",
      "Topluluk kuralları ihlal edildiğinde hesap önceden haber verilmeksizin askıya alınabilir veya sonlandırılabilir.",
    ],
  },
]

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleEmailChange = (value: string) => {
    const cleaned = value.trim().toLowerCase()

    if (!cleaned) {
      setFormData((prev) => ({ ...prev, email: "" }))
      return
    }

    const normalized = cleaned.includes("@") ? formatBilgiEmail(cleaned) : cleaned
    setFormData((prev) => ({ ...prev, email: normalized }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")
    console.log("🚀 Signup başladı")

    if (!hasAcceptedTerms) {
      console.log("❌ Sorumluluk metni onaylanmadı")
      setStatus("error")
      setErrorMessage("Hesap oluşturmak için Sorumluluk Reddi ve Açık Rıza metnini onaylamanız gerekir.")
      return
    }

    const email = formatBilgiEmail(formData.email)
    console.log("Email:", email)

    // Validate email domain
    if (!email) {
      console.log("❌ Email validasyonu başarısız:", formData.email)
      setStatus("error")
      setErrorMessage("Bilgi e-posta adresinizi yazın. Alan adı otomatik eklenecek.")
      return
    }
    console.log("✅ Email validasyonu başarılı")

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      console.log("❌ Şifreler eşleşmiyor")
      setStatus("error")
      setErrorMessage("Şifreler eşleşmiyor.")
      return
    }
    console.log("✅ Şifre eşleşmesi doğru")

    // Validate password length
    if (formData.password.length < 6) {
      console.log("❌ Şifre çok kısa:", formData.password.length)
      setStatus("error")
      setErrorMessage("Şifre en az 6 karakter olmalıdır.")
      return
    }
    console.log("✅ Şifre uzunluğu yeterli")

    setStatus("loading")

    try {
      console.log("📤 Supabase signUp çağrısı yapılıyor...")
      const { data, error } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: formData.name,
          },
        },
      })

      console.log("📥 Supabase signUp yanıtı:", { data, error })

      if (error) {
        console.error("❌ SignUp hatası:", error)
        throw error
      }

      console.log("✅ SignUp başarılı, user:", data.user?.id)
      console.log("Session var mı?", !!data.session)

      if (data.user) {
        // Profile will be created automatically by database trigger
        console.log("👤 Kullanıcı metadata güncelleniyor...")
        
        // Update name in metadata
        if (formData.name) {
          try {
            await supabase.auth.updateUser({
              data: { name: formData.name }
            })
            console.log("✅ Metadata güncellendi")
          } catch (updateError) {
            console.error("⚠️ Metadata güncellenirken hata:", updateError)
          }
        }

        console.log("✅ Status success olarak ayarlanıyor")
        setStatus("success")

        // If email confirmation is disabled, redirect directly
        if (data.session) {
          console.log("🔄 Session var, profile'a yönlendiriliyor...")
          window.location.href = "/profile"
        } else {
          console.log("📧 Email confirmation gerekli, success mesajı gösteriliyor")
        }
      } else {
        console.log("⚠️ data.user yok!")
        setStatus("error")
        setErrorMessage("Kayıt işlemi tamamlanamadı. Lütfen tekrar deneyin.")
      }
    } catch (error) {
      console.error("💥 Catch bloğu yakaladı:", error)
      setStatus("error")
      if (error instanceof Error) {
        console.error("Error message:", error.message)
        if (error.message.includes("already registered")) {
          setErrorMessage("Bu e-posta adresi zaten kayıtlı.")
        } else {
          setErrorMessage(error.message)
        }
      } else {
        setErrorMessage("Kayıt sırasında bir hata oluştu.")
      }
    }
    console.log("🏁 Signup fonksiyonu tamamlandı, son status:", status)
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
                <div className="relative">
                  <Input
                    id="email"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    required
                    className={cn(
                      "mt-1 bg-dark-bg border-border",
                      !formData.email.includes("@") ? "pr-32" : "pr-3"
                    )}
                    placeholder="ad.soyad"
                  />
                  {!formData.email.includes("@") && (
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

              <div className="space-y-3 rounded-xl border border-border bg-dark-bg/50 p-4">
                <Collapsible>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-dark-bg/70 px-4 py-3 text-left transition-colors hover:bg-dark-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-bilgi-red/60">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Kullanım Koşulları, Sorumluluk Reddi ve Açık Rıza Metni
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Lütfen aşağıdaki koşulları dikkatlice okuyup onaylayın. Onay olmadan hesap açılmaz.
                      </p>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-transform data-[state=open]:rotate-180"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-3">
                    <ScrollArea className="h-64 w-full rounded-lg border border-border bg-dark-bg/60 p-4">
                      <div className="space-y-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-foreground font-semibold">
                            Bilgi Santa – Kullanım Koşulları, Sorumluluk Reddi ve Açık Rıza Metni
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Bu platformu kullanarak tüm riskleri ve sonuçları üstlendiğinizi; hesap oluşturma, bilgi
                            paylaşımı ve katılımlara ilişkin tüm sorumluluğun size ait olduğunu kabul ve beyan edersiniz.
                          </p>
                        </div>

                        {LIABILITY_SECTIONS.map((section) => (
                          <div key={section.title} className="space-y-2">
                            <p className="text-sm font-semibold text-foreground">{section.title}</p>
                            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                              {section.points.map((point) => (
                                <li key={point}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        ))}

                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">7. Onay Beyanı</p>
                          <p className="text-xs text-muted-foreground">
                            Hesap oluşturma adımına devam ederek; yukarıdaki tüm maddeleri okuduğunuzu, anladığınızı ve
                            eksiksiz olarak kabul ettiğinizi; platformu ve geliştiricilerini her türlü iddia ve
                            talepten feragat ettiğinizi; kişisel verilerinizin belirtilen amaçlar doğrultusunda
                            işlenmesine ve e-posta iletişimine açık rıza verdiğinizi beyan etmiş olursunuz.
                          </p>
                        </div>
                      </div>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex flex-row items-start gap-3 flex-wrap">
                  <Checkbox
                    id="terms"
                    checked={hasAcceptedTerms}
                    onCheckedChange={(checked) => setHasAcceptedTerms(checked === true)}
                    className="mt-0.5 h-4 w-4 sm:h-5 sm:w-5 border-2 border-foreground/60 data-[state=checked]:bg-bilgi-red data-[state=checked]:border-bilgi-red"
                  />
                  <Label
                    htmlFor="terms"
                    className="block text-[11px] sm:text-xs text-foreground leading-snug sm:leading-relaxed break-words text-left flex-1 min-w-0"
                  >
                    Yukarıdaki{" "}
                    <span className="font-semibold">Kullanım Koşulları, Sorumluluk Reddi ve Açık Rıza</span> metnini
                    okudum, anladım ve <span className="font-semibold">onaylıyorum</span>. Bu kutucuğu işaretlemeden
                    hesap açamayacağımı kabul ediyorum.
                  </Label>
                </div>
              </div>

              {status === "error" && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-500 text-sm">{errorMessage}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={status === "loading" || !hasAcceptedTerms}
                className="w-full btn-bilgi"
              >
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
