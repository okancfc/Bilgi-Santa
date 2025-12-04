"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase, type Profile } from "@/lib/supabaseClient"
import { CLASS_YEARS } from "@/lib/constants"
import { StarsBackground } from "@/components/StarsBackground"
import { UserNav } from "@/components/UserNav"
import { InterestSelector } from "@/components/InterestSelector"
import { GiftPreferenceSelector } from "@/components/GiftPreferenceSelector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [profile, setProfile] = useState<Partial<Profile>>({
    name: "",
    department: "",
    class_year: undefined,
    interests: [],
    gift_preferences: "",
    favorite_things: [],
    about_me: "",
  })
  const [selectedGiftPrefs, setSelectedGiftPrefs] = useState<string[]>([])
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      console.log("📂 Profil yükleme başladı")
      try {
        console.log("🔍 Auth kullanıcısı getiriliyor...")
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        console.log("📥 Auth yanıtı:", { 
          user: authUser?.id, 
          email: authUser?.email,
          error: authError?.message 
        })

        if (authError) {
          console.error("❌ Auth hatası:", authError)
        }

        if (!authUser) {
          console.log("🚫 Kullanıcı yok, login'e yönlendiriliyor")
          router.push("/login")
          return
        }

        console.log("✅ Auth kullanıcısı bulundu:", authUser.email)
        console.log("👤 User state set ediliyor:", { id: authUser.id, email: authUser.email })
        setUser({ id: authUser.id, email: authUser.email || "" })

        // Load existing profile
        console.log("📊 Mevcut profil sorgulanıyor...")
        const { data: existingProfile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", authUser.id)
          .single()

        console.log("📥 Profil sorgu sonucu:", { 
          exists: !!existingProfile, 
          error: profileError?.message 
        })

        if (existingProfile) {
          console.log("✅ Mevcut profil bulundu:")
          console.log("  - Name:", existingProfile.name)
          console.log("  - Department:", existingProfile.department)
          console.log("  - Class Year:", existingProfile.class_year)
          console.log("  - Interests:", existingProfile.interests?.length || 0)
          console.log("  - Gift Preferences:", existingProfile.gift_preferences)
          console.log("  - Favorite Things:", existingProfile.favorite_things?.length || 0)
          
          setProfile(existingProfile)
          
          // Parse gift preferences if stored as comma-separated string
          if (existingProfile.gift_preferences) {
            const prefs = existingProfile.gift_preferences.split(",").map((s: string) => s.trim())
            console.log("🎁 Gift preferences parsed:", prefs)
            setSelectedGiftPrefs(prefs)
          }
        } else {
          console.log("⚠️ Profil bulunamadı, yeni profil oluşturuluyor")
          console.log("Metadata name:", authUser.user_metadata?.name)
          
          // Create a new profile
          setProfile((prev) => ({
            ...prev,
            name: authUser.user_metadata?.name || "",
            email: authUser.email,
          }))
        }
        
        console.log("✅ Profil yükleme tamamlandı")
      } catch (error) {
        console.error("💥 Profil yükleme hatası:", error)
      } finally {
        console.log("🏁 Loading false olarak set ediliyor")
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("💾 Profil kaydetme başladı")
    console.log("👤 User state:", user)
    
    if (!user) {
      console.error("❌ User state boş!")
      console.error("Bu bir bug - sayfayı yenileyip tekrar deneyin")
      setMessage({ 
        type: "error", 
        text: "Oturum hatası. Lütfen sayfayı yenileyip tekrar deneyin." 
      })
      return
    }
    
    console.log("✅ User ID:", user.id)
    console.log("✅ User Email:", user.email)

    setSaving(true)
    setMessage(null)

    // Validation
    console.log("🔍 Form validasyonu başlıyor...")
    const missingFields: string[] = []
    
    if (!profile.name || profile.name.trim() === "") {
      missingFields.push("İsim Soyisim")
    }
    if (!profile.department || profile.department.trim() === "") {
      missingFields.push("Bölüm")
    }
    if (!profile.class_year) {
      missingFields.push("Sınıf")
    }
    if (!profile.interests || profile.interests.length === 0) {
      missingFields.push("İlgi Alanları (en az 1 tane)")
    }
    if (!selectedGiftPrefs || selectedGiftPrefs.length === 0) {
      missingFields.push("Hediye Tercihleri (en az 1 tane)")
    }
    console.log("📋 Form durumu:")
    console.log("  - İsim:", profile.name || "❌ BOŞ")
    console.log("  - Email:", user.email || "❌ BOŞ")
    console.log("  - Bölüm:", profile.department || "❌ BOŞ")
    console.log("  - Sınıf:", profile.class_year || "❌ BOŞ")
    console.log("  - İlgi Alanları:", profile.interests?.length || 0, "adet")
    console.log("  - Hediye Tercihleri:", selectedGiftPrefs.length, "adet")
    console.log("  - Favori Şeyler:", profile.favorite_things?.length || 0, "adet")
    console.log("  - Hakkımda:", profile.about_me ? "✅ DOLU" : "⚠️ BOŞ (opsiyonel)")

    if (missingFields.length > 0) {
      console.error("❌ EKSİK ALANLAR:")
      missingFields.forEach(field => console.error(`   - ${field}`))
      setMessage({ 
        type: "error", 
        text: `Lütfen şu alanları doldurun: ${missingFields.join(", ")}` 
      })
      setSaving(false)
      return
    }

    console.log("✅ Tüm alanlar dolu, kaydetme işlemi başlıyor...")

    try {
      const profileData = {
        user_id: user.id,
        name: profile.name,
        email: user.email,
        department: profile.department,
        class_year: profile.class_year,
        interests: profile.interests || [],
        gift_preferences: selectedGiftPrefs.join(", "),
        favorite_things: profile.favorite_things || [],
        about_me: profile.about_me,
        is_active: true,
        profile_completed: true,
        updated_at: new Date().toISOString(),
      }

      console.log("📤 Supabase'e gönderiliyor...")
      const { error } = await supabase.from("profiles").upsert(profileData, { onConflict: "user_id" })

      if (error) {
        console.error("❌ Supabase hatası:", error)
        throw error
      }

      console.log("✅✅✅ PROFİL BAŞARIYLA KAYDEDİLDİ! ✅✅✅")
      setMessage({ type: "success", text: "Profil başarıyla kaydedildi!" })

      // Redirect to availability page after a short delay
      console.log("🔄 1.5 saniye sonra availability sayfasına yönlendirilecek...")
      setTimeout(() => {
        console.log("➡️ Availability sayfasına yönlendiriliyor...")
        router.push("/availability")
      }, 1500)
    } catch (error) {
      console.error("💥 Profil kaydetme hatası:", error)
      setMessage({ type: "error", text: "Profil kaydedilirken bir hata oluştu." })
    } finally {
      setSaving(false)
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

  return (
    <main className="relative min-h-screen">
      <StarsBackground />
      <UserNav userName={profile.name} />

      <div className="relative z-10 pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl md:text-4xl font-bold gradient-text mb-2">Profilini Tamamla</h1>
            <p className="text-muted-foreground">Eşleştirme için bilgilerini doldur</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info Card */}
            <div className="bg-dark-card border border-border rounded-2xl p-6 card-glow">
              <h2 className="font-heading text-xl font-bold mb-6 flex items-center gap-2">
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
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Temel Bilgiler
              </h2>

              <div className="grid gap-5">
                <div>
                  <Label htmlFor="name">İsim</Label>
                  <Input
                    id="name"
                    type="text"
                    value={profile.name || ""}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    required
                    className="mt-1 bg-dark-bg border-border"
                    placeholder="Adınız Soyadınız"
                  />
                </div>

                <div>
                  <Label htmlFor="department">Bölüm</Label>
                  <Input
                    id="department"
                    type="text"
                    value={profile.department || ""}
                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                    required
                    className="mt-1 bg-dark-bg border-border"
                    placeholder="Örn: Bilgisayar Mühendisliği"
                  />
                </div>

                <div>
                  <Label htmlFor="class_year">Sınıf</Label>
                  <select
                    id="class_year"
                    value={profile.class_year || ""}
                    onChange={(e) => setProfile({ ...profile, class_year: Number.parseInt(e.target.value) })}
                    required
                    className="mt-1 w-full px-3 py-2 bg-dark-bg border border-border rounded-md text-foreground"
                  >
                    <option value="">Seçin</option>
                    {CLASS_YEARS.map((year) => (
                      <option key={year.value} value={year.value}>
                        {year.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Interests Card */}
            <div className="bg-dark-card border border-border rounded-2xl p-6 card-glow">
              <h2 className="font-heading text-xl font-bold mb-2 flex items-center gap-2">
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
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
                İlgi Alanları
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                Seninle ortak ilgi alanlarına sahip biriyle eşleşmen için seçimlerini yap
              </p>

              <InterestSelector
                selectedInterests={profile.interests || []}
                onInterestsChange={(interests) => setProfile({ ...profile, interests })}
              />
            </div>

            {/* Gift Preferences Card */}
            <div className="bg-dark-card border border-border rounded-2xl p-6 card-glow">
              <h2 className="font-heading text-xl font-bold mb-2 flex items-center gap-2">
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
                  <rect x="3" y="8" width="18" height="4" rx="1" />
                  <path d="M12 8v13" />
                  <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
                  <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
                </svg>
                Hediye Tercihleri
              </h2>
              <p className="text-muted-foreground text-sm mb-6">Almaktan hoşlanacağın hediye türlerini seç</p>

              <GiftPreferenceSelector
                selectedPreferences={selectedGiftPrefs}
                onPreferencesChange={setSelectedGiftPrefs}
              />
            </div>

            {/* About Me Card */}
            <div className="bg-dark-card border border-border rounded-2xl p-6 card-glow">
              <h2 className="font-heading text-xl font-bold mb-2 flex items-center gap-2">
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
                  <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z" />
                  <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
                </svg>
                Hakkında
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                Kendini tanıtan kısa bir yazı yaz (eşleştiğin kişi görecek)
              </p>

              <Textarea
                value={profile.about_me || ""}
                onChange={(e) => setProfile({ ...profile, about_me: e.target.value })}
                rows={4}
                className="bg-dark-bg border-border resize-none"
                placeholder="Merhaba! Ben... (en fazla 500 karakter)"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-2 text-right">{profile.about_me?.length || 0}/500</p>
            </div>

            {/* Message */}
            {message && (
              <div
                className={`p-4 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-500/10 border border-green-500/30 text-green-500"
                    : "bg-red-500/10 border border-red-500/30 text-red-500"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" disabled={saving} className="w-full btn-bilgi text-lg py-6">
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
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
                  Kaydediliyor...
                </span>
              ) : (
                "Kaydet ve Devam Et"
              )}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
