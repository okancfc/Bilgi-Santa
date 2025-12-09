// Target date for the event countdown
export const TARGET_DATE = new Date("2025-02-14T00:00:00")

// Interest categories and options
export const INTEREST_CATEGORIES = {
  sosyal: {
    label: "Sosyal",
    items: [
      "Sohbet etmek",
      "Yeni insanlarla tanışmak",
      "Pati Severler",
      "Partiler",
      "Topluluklar",
      "Eslab Piyasa",
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
    items: ["Spor yapmak", "Yoga/Meditasyon", "Bebek Koşu Tayfa", "Bilgi Riders", "Dans", "Doğa gezileri", "Seyahat", "IQOS"],
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

export const SANTRAL_CAMPUS = { value: "santralistanbul", label: "santralistanbul" }

export const CAMPUS_LOCATION_OPTIONS = {
  santralistanbul: [
    { value: "csm-onu", label: "ÇSM Önü Banklar" },
    { value: "gastronomi-onu", label: "Gastronomi Önü Banklar" },
    { value: "espresso-yani", label: "Espresso Lab" },
    { value: "lokanta-yani", label: "Lokanta Sosyal Bahçesi" },
    { value: "blab", label: "Blab" },
    { value: "caffe-nero", label: "Caffe Nero" },
    { value: "sunpeak", label: "Sunpeak" },
    { value: "starbucks", label: "Starbucks" },
  ],
}

export const HOURLY_TIME_OPTIONS = Array.from({ length: 13 }, (_item, index) => {
  const hour = 9 + index
  const value = `${String(hour).padStart(2, "0")}:00`
  return { value, label: value }
})

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
