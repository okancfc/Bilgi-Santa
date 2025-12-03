import Link from "next/link"

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20">
      <div className="max-w-4xl mx-auto text-center z-10">
        {/* Year badge */}
        <div className="inline-block mb-6">
          <span className="px-4 py-2 bg-bilgi-red/20 border border-bilgi-red/30 rounded-full text-bilgi-red font-medium text-sm">
            2026
          </span>
        </div>

        {/* Main title */}
        <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight">
          <span className="gradient-text">Bilgi Santa</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-muted-foreground mb-4 font-heading">
          Gizli Arkadaş Eşleştirme Platformu
        </p>

        {/* Description */}
        <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto mb-10 leading-relaxed">
          İstanbul Bilgi Üniversitesi öğrencileri için anonim hediye eşleştirme ve buluşma platformu. Yeni arkadaşlıklar
          kur, sürpriz hediyeler al ve kampüste keyifli anılar biriktir!
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/signup" className="btn-bilgi px-8 py-4 text-lg rounded-xl inline-flex items-center gap-2">
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" x2="19" y1="8" y2="14" />
              <line x1="22" x2="16" y1="11" y2="11" />
            </svg>
            Profil Oluştur
          </Link>

          <Link
            href="/login"
            className="px-8 py-4 text-lg rounded-xl border border-border bg-secondary/50 hover:bg-secondary transition-all duration-300 inline-flex items-center gap-2"
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
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" x2="3" y1="12" y2="12" />
            </svg>
            Giriş Yap
          </Link>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-bilgi-red/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-gold-accent/10 rounded-full blur-3xl" />
      </div>
    </section>
  )
}
