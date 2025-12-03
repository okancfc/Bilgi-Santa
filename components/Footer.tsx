"use client"

import { useState } from "react"
import { ContactModal } from "./ContactModal"

export function Footer() {
  const [isContactOpen, setIsContactOpen] = useState(false)

  return (
    <>
      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Logo and info */}
            <div className="text-center md:text-left">
              <h3 className="font-heading text-xl font-bold gradient-text mb-2">Bilgi Santa</h3>
              <p className="text-muted-foreground text-sm">İstanbul Bilgi Üniversitesi Gizli Arkadaş Platformu</p>
              <p className="text-muted-foreground text-xs mt-1">© 2025 Tüm hakları saklıdır.</p>
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
          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <p className="text-muted-foreground text-xs">
              Bu platform İstanbul Bilgi Üniversitesi öğrencileri için hazırlanmıştır. Kayıt olmak için @bilgi.edu.tr
              uzantılı e-posta adresi gereklidir.
            </p>
          </div>
        </div>
      </footer>

      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </>
  )
}
