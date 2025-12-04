// Target date for the event countdown
export const TARGET_DATE = new Date("2025-02-14T00:00:00")

// Interest categories and options
export const INTEREST_CATEGORIES = {
  sosyal: {
    label: "Sosyal",
    items: [
      "Sohbet etmek",
      "Yeni insanlarla tanışmak",
      "Partiler",
      "Kültürel etkinlikler",
      "Gönüllülük",
      "Topluluklar",
    ],
  },
  hobiler: {
    label: "Hobiler",
    items: [
      "Okumak",
      "Yazı yazmak",
      "Müzik dinlemek",
      "Enstrüman çalmak",
      "Fotoğrafçılık",
      "Resim/Çizim",
      "El işleri",
      "Yemek yapmak",
      "Oyun oynamak",
      "Film/Dizi izlemek",
      "Podcast dinlemek",
    ],
  },
  aktifYasam: {
    label: "Aktif Yaşam",
    items: ["Spor yapmak", "Yoga/Meditasyon", "Yürüyüş", "Bisiklet", "Dans", "Doğa gezileri", "Seyahat"],
  },
  akademik: {
    label: "Akademik",
    items: ["Araştırma", "Tartışma", "Dil öğrenmek", "Kodlama", "Tasarım", "Girişimcilik"],
  },
}

export const GIFT_PREFERENCES = [
  "Kitap",
  "Kırtasiye",
  "Yiyecek/İçecek",
  "El yapımı hediye",
  "Aksesuar",
  "Bitki",
  "Mum/Koku",
  "Çikolata",
  "Oyun",
  "Sürpriz olsun",
]

export const CAMPUS_OPTIONS = [
  { value: "santralistanbul", label: "santralistanbul" },
  { value: "kustepe", label: "Kuştepe" },
  { value: "dolapdere", label: "Dolapdere" },
]

export const CLASS_YEARS = [
  { value: 1, label: "1. Sınıf" },
  { value: 2, label: "2. Sınıf" },
  { value: 3, label: "3. Sınıf" },
  { value: 4, label: "4. Sınıf" },
  { value: 5, label: "5+ Sınıf / Yüksek Lisans" },
]

// Admin emails (for matching authorization)
export const ADMIN_EMAILS = [
  "gaffar.cifci@bilgiedu.net",
  // Add more admin emails here
]
