"use client"

import Image from "next/image"

import { ContactCard } from "./ContactModal"
import bilgiSantaLogo from "@/public/bilgi-santa-logo.png"

export function Footer() {

  return (
    <footer className="py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="grid gap-6">
          <div className="flex justify-center items-center lg:items-start gap-4 text-center lg:text-left">
            <Image src={bilgiSantaLogo} alt="Bilgi Santa" sizes="200px" className="h-12 w-auto" />
          </div>
          <ContactCard />
        </div>
        <div className="pt-6 border-t border-border/75 flex flex-col items-center gap-3">
          <a
            href="https://www.linkedin.com/in/bilgi-meca-51629a387/"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 px-3 py-2 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
            aria-label="Bilgi Meca LinkedIn"
          >
            <span className="text-xs font-semibold tracking-[0.12em] text-muted-foreground group-hover:text-bilgi-red transition-colors">
              MADE BY
            </span>
            <span className="relative inline-flex w-10 h-10 items-center justify-center">
              <span className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-bilgi-red/35 via-bilgi-red/15 to-gold-accent/15 blur-xl opacity-80 group-hover:blur-[22px] group-hover:opacity-100 transition-all duration-500" />
              <span className="absolute inset-0 rounded-full border border-bilgi-red/25 bg-bilgi-red/10 blur-sm opacity-80 group-hover:border-bilgi-red/45 group-hover:opacity-100 transition-all duration-500" />
              <span className="relative w-10 h-10 rounded-full bg-gradient-to-b from-dark-card to-dark-bg-lighter border border-white/10 ring-2 ring-bilgi-red/35 ring-offset-2 ring-offset-black shadow-[0_10px_28px_rgba(0,0,0,0.55),0_0_20px_rgba(227,30,36,0.45)] overflow-hidden group-hover:ring-bilgi-red/60 group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_26px_rgba(227,30,36,0.55)] transition-all duration-300">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.12),transparent_55%)]" />
                <Image
                  src="/linkedin-logo.png"
                  alt="Bilgi Meca"
                  fill
                  sizes="40px"
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </span>
            </span>
          </a>
        </div>
      </div>
    </footer>
  )
}
