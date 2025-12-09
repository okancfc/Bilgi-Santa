"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
    title: "Platformun Rolü ve Kapsamı",
    points: [
      "Bilgi Santa, katılımcılar arasında hediyeleşme ve buluşma planlamasını kolaylaştıran, resmi kurumları temsil etmeyen gönüllü bir platformdur.",
      "Platform yalnızca eşleşme ve iletişim için teknik altyapı sağlar; etkinlik, buluşma, hediye temini, kargo, ödeme veya lojistik süreçlerinin hiçbirinden sorumlu değildir.",
    ],
  },
  {
    title: "Katılımcı Beyanları ve Yükümlülükleri",
    points: [
      "Hesabı kendi adınıza ve doğru bilgilerle açtığınızı; gerçek kimliğinizi beyan ettiğinizi kabul edersiniz.",
      "Paylaştığınız her türlü içerikten (fotoğraf, mesaj, konum, hediye önerisi vb.) hukuken yalnızca siz sorumlusunuz; telif, kişilik hakkı ve KVKK ihlalleri dahil tüm riskleri üstlenirsiniz.",
      "Yasa dışı, saldırgan, tehdit edici, rahatsız edici veya alkol/tütün/uyuşturucu kullanımını teşvik eden içerik paylaşmayacağınızı kabul edersiniz; tespit halinde hesabınız uyarı olmaksızın kısıtlanabilir ve gerekli mercilere bildirim yapılabilir.",
    ],
  },
  {
    title: "Buluşma ve Hediyeleşme Riskleri",
    points: [
      "Buluşma yeri ve zamanı seçimi, güvenlik, ulaşım, kargo ve teslimat süreçleri tamamen sizin sorumluluğunuzdadır; olası kayıp, çalıntı, gecikme, kaza, yaralanma veya benzeri tüm sonuçlardan yalnızca siz sorumlusunuz.",
      "Platform hiçbir şekilde tahsilat/ödeme aracı değildir; hediyeleşme ve alışveriş işlemlerinden doğan bedel, masraf ve vergiler size aittir.",
      "Üçüncü kişilerle yaşanabilecek anlaşmazlık, iptal, gecikme veya memnuniyetsizliklerde platform arabulucu veya garantör değildir.",
    ],
  },
  {
    title: "Fotoğraf ve İçerik Paylaşımı",
    points: [
      "Paylaştığınız fotoğraf, video, yorum ve her türlü içerik için gerekli tüm izinleri aldığınızı ve üçüncü kişilerin haklarını ihlal etmediğinizi beyan edersiniz.",
      "Şikayet veya ihlal şüphesinde içerik kaldırılabilir, hesap kısıtlanabilir ve yetkili mercilere bilgi verilebilir; bu süreçlerden doğacak sonuçlar size aittir.",
      "Barındırma, iletim veya depolama sırasında meydana gelebilecek erişim kesintisi, veri kaybı veya hasarlardan platform sorumlu tutulamaz.",
    ],
  },
  {
    title: "Kişisel Veriler ve İletişim",
    points: [
      "Kayıt sırasında sağladığınız ad, e-posta ve isteğe bağlı diğer bilgiler eşleşme, bilgilendirme ve güvenlik amaçlarıyla işlenir; iletişim için sizinle e-posta veya uygulama içi bildirim yoluyla irtibat kurulabilir.",
      "Kişisel verilerin korunmasına yönelik makul teknik/idari tedbirler alınsa da yetkisiz erişim, saldırı veya veri sızıntısı risklerini bildiğinizi ve bu ihtimallerde platformu sorumlu tutmayacağınızı kabul edersiniz.",
    ],
  },
  {
    title: "Sorumluluk Reddi ve Feragat",
    points: [
      "Platform ve geliştiricileri; doğrudan/dolaylı zarar, kar kaybı, itibar kaybı, veri kaybı, kişisel yaralanma veya üçüncü kişilerin talepleri dahil hiçbir sonuçtan sorumlu değildir.",
      "Hizmetin kesilmesi, bakım, güncelleme, hata veya güvenlik gerekçesiyle erişimin sınırlandırılması durumunda hesap veya içerik kaybı yaşayabileceğinizi; platformun bu durumlarda tazmin yükümlülüğü olmadığını kabul edersiniz.",
      "Hesabınız, topluluk kurallarına aykırı davranmanız halinde önceden bildirim yapılmaksızın askıya alınabilir veya sonlandırılabilir.",
    ],
  },
  {
    title: "Hukuki Çerçeve ve Onay",
    points: [
      "Bu koşullar gerektiğinde güncellenebilir; güncel metni takip etmek sizin sorumluluğunuzdadır.",
      "Türk hukuku geçerlidir; İstanbul (Merkez) mahkemeleri ve icra daireleri yetkilidir.",
      "Bu metni onaylayarak tüm riskleri ve sorumlulukları üstlendiğinizi, platformu ve geliştiricilerini her türlü talep ve sorumluluktan feragat ettiğinizi kabul edersiniz.",
    ],
  },
]

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const validateEmail = (email: string): boolean => {
    return email.toLowerCase().endsWith("@bilgiedu.net")
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

    // Validate email domain
    if (!validateEmail(formData.email)) {
      console.log("❌ Email validasyonu başarısız:", formData.email)
      setStatus("error")
      setErrorMessage("Sadece @bilgiedu.net uzantılı e-posta adresleri kabul edilmektedir.")
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
        email: formData.email,
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
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="mt-1 bg-dark-bg border-border"
                  placeholder="ogrenci@bilgiedu.net"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Sadece @bilgiedu.net uzantılı adresler kabul edilir.
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

              <div className="space-y-3 rounded-xl border border-border bg-dark-bg/50 p-4">
                <Collapsible>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-dark-bg/70 px-4 py-3 text-left transition-colors hover:bg-dark-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-bilgi-red/60">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Sorumluluk Reddi ve Açık Rıza Metni</p>
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
                            Bilgi Santa Kullanım Koşulları ve Sorumluluk Reddi
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Bu platformu kullanarak tüm riskleri ve sonuçları üstlendiğinizi, hesap oluşturma ve
                            katılımlara ilişkin her türlü sorumluluğun size ait olduğunu kabul edersiniz.
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
                          <p className="text-sm font-semibold text-foreground">Onay Beyanı</p>
                          <p className="text-xs text-muted-foreground">
                            Hesap oluşturma adımına devam ederek yukarıdaki tüm maddeleri okuduğunuzu, anladığınızı ve
                            eksiksiz şekilde kabul ettiğinizi; platformu ve geliştiricilerini her türlü iddia, talep ve
                            sorumluluktan feragat ettiğinizi beyan edersiniz.
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
                    <span className="font-semibold">Sorumluluk Reddi ve Açık Rıza</span> metnini okudum, anladım ve{" "}
                    <span className="font-semibold">onaylıyorum</span>. Bu kutucuğu işaretlemeden hesap açamayacağımı
                    kabul ediyorum.
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
