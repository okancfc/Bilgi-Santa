interface HowWeMeetBannerProps {
  fullHeight?: boolean
}

export function HowWeMeetBanner({ fullHeight = false }: HowWeMeetBannerProps) {
  const sectionClasses = fullHeight
    ? "min-h-screen flex items-center px-4 py-8 md:py-10"
    : "py-10 md:py-16 px-4 flex items-center"

  return (
    <section className={sectionClasses}>
      <div className="max-w-5xl mx-auto w-full">
        <div className="bg-gradient-to-br from-bilgi-red/20 via-dark-card to-gold-accent/10 border border-bilgi-red/30 rounded-3xl mb-12 p-6 sm:p-8 md:p-10 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-52 h-52 md:w-64 md:h-64 bg-bilgi-red/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 md:w-48 md:h-48 bg-gold-accent/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row gap-6 md:gap-10 items-center">
              {/* Left content */}
              <div className="flex-1">
                <h2 className="font-heading text-2xl md:text-4xl font-bold mb-3 md:mb-4">
                  <span className="gradient-text">Nasıl Buluşacağız?</span>
                </h2>
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4 md:mb-6">
                  Eşleştirme tamamlandığında, sistem sana özel bir buluşma kartı oluşturacak. Bu kartta buluşma zamanı,
                  yeri ve eşleştiğin kişinin ilgi alanlarına dair ipuçları yer alacak - ama kimliği gizli kalacak!
                </p>
              </div>

              {/* Right content - Sample card preview */}
              <div className="flex-1 max-w-md w-full">
                <div className="bg-dark-bg border border-border rounded-2xl p-5 sm:p-6 shadow-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-bilgi-red/20 flex items-center justify-center">
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
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                        <line x1="16" x2="16" y1="2" y2="6" />
                        <line x1="8" x2="8" y1="2" y2="6" />
                        <line x1="3" x2="21" y1="10" y2="10" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Buluşma Kartı</p>
                      <p className="font-heading font-bold text-gold-accent">BILGI-XXXXXX</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tarih:</span>
                      <span className="text-foreground font-medium">24 Aralık 2025</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saat:</span>
                      <span className="text-foreground font-medium">13:00 - 14:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Yer:</span>
                      <span className="text-foreground font-medium">santralistanbul Kafeterya</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">Eşinin İlgi Alanları:</p>
                    <div className="flex flex-wrap gap-2">
                      {["Müzik", "Kitap", "Fotoğrafçılık"].map((interest) => (
                        <span
                          key={interest}
                          className="px-2.5 py-1 bg-bilgi-red/10 text-bilgi-red text-[11px] rounded-full border border-bilgi-red/30"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
