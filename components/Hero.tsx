import Image from "next/image"
import Link from "next/link"

import heroBg from "@/public/hero-bg2-min.webp"
import bilgiSantaLogo from "@/public/bilgi-santa-logo.png"

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-start pb-20 overflow-hidden">
      <div className="relative lg:w-[50vw] w-[100vw] ml-[calc(50%-50vw)] h-60 lg:h-96 mb-2 overflow-hidden">
        <Image
          src={heroBg}
          alt="Hero Background"
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/40 to-black pointer-events-none"
          aria-hidden
        />

        <div
          className="absolute inset-0 bg-gradient-to-t h-20 from-background/0 via-background/40 to-black pointer-events-none"
          aria-hidden
        />

        <div
          className="absolute top-0 bottom-0 w-5 sm:w-20 right-0 bg-gradient-to-r from-background/0 via-background/40 to-black pointer-events-none"
          aria-hidden
        />

        <div
          className="absolute top-0 bottom-0 w-5 sm:w-20 left-0 bg-gradient-to-l from-background/0 via-background/40 to-black pointer-events-none"
          aria-hidden
        />
      </div>
      <div className="relative max-w-4xl mx-auto text-center z-10 px-4 sm:px-6">
        {/* Main title */}
        <h1 className="mb-6 flex justify-center">
          <span className="sr-only">Bilgi Santa</span>
          <Image
            src={bilgiSantaLogo}
            alt="Bilgi Santa"
            priority
            className="h-20 w-auto md:h-26 lg:h-32 drop-shadow-[0_16px_48px_rgba(0,0,0,0.35)]"
            sizes="(min-width: 1024px) 320px, (min-width: 768px) 260px, 220px"
          />
        </h1>

        {/* Description */}
        <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto mb-10 leading-relaxed">
          İstanbul Bilgi Üniversitesi öğrencileri için hediyeleşme platformu. Yeni arkadaşlıklar
          kur, sürpriz hediyeler al ve kampüste keyifli anılar biriktir!
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/signup" className="btn-bilgi px-8 py-2 text-lg rounded-xl w-full inline-flex justify-center items-center gap-2">
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
            className="px-8 py-3 w-full text-lg rounded-xl border border-border bg-secondary/50 hover:bg-secondary transition-all duration-300 inline-flex items-center justify-center gap-2"
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
        <div
          className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 bg-bilgi-red/10 rounded-full blur-3xl -z-10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-10 -right-20 w-72 h-72 bg-gold-accent/10 rounded-full blur-3xl -z-10"
          aria-hidden
        />
      </div>
    </section>
  )
}
