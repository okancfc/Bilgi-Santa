"use client"

import Image from "next/image"
import { useState } from "react"

import { ContactModal } from "./ContactModal"
import bilgiSantaLogo from "@/public/bilgi-santa-logo.png"

export function Footer() {
  const [isContactOpen, setIsContactOpen] = useState(false)

  return (
    <>
      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Logo and info */}
            <div className="text-center md:text-left">
              <div className="flex justify-center md:justify-start">
                <Image src={bilgiSantaLogo} alt="Bilgi Santa" sizes="200px" className="h-12 w-auto" />
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setIsContactOpen(true)}
                className="px-6 py-3 bg-bilgi-red/10 border border-bilgi-red/30 rounded-lg text-bilgi-red hover:bg-bilgi-red/20 transition-colors flex items-center gap-2"
              >
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
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                İletişim
              </button>
            </div>
          </div>

          {/* Bottom note */}
          <div className="mt-8 pt-6 border-t border-border/75 flex flex-col items-center gap-3">
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

      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </>
  )
}
