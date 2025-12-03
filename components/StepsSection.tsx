const steps = [
  {
    number: 1,
    title: "Kayıt Ol",
    description: "Bilgi e-posta adresinle (@bilgi.edu.tr) hızlıca kayıt ol.",
  },
  {
    number: 2,
    title: "Profilini Tamamla",
    description: "İlgi alanlarını, hediye tercihlerini ve kendini tanıtan bilgileri gir.",
  },
  {
    number: 3,
    title: "Müsaitliğini Belirle",
    description: "Buluşabileceğin gün ve saatleri seç, tercih ettiğin kampüsü belirt.",
  },
  {
    number: 4,
    title: "Eşleşmeyi Bekle",
    description: "Sistem seni ortak ilgi alanlarına sahip biriyle eşleştirecek.",
  },
  {
    number: 5,
    title: "Buluş ve Tanış",
    description: "Buluşma kartını al, hediyeni hazırla ve yeni arkadaşınla tanış!",
  },
]

export function StepsSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">Nasıl Çalışır?</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Beş basit adımda yeni arkadaşlıklar edinmeye başla
          </p>
        </div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-bilgi-red via-gold-accent to-bilgi-red transform -translate-x-1/2" />

          <div className="space-y-8 md:space-y-0">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`relative flex flex-col md:flex-row items-center gap-6 md:gap-12 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Content */}
                <div className={`flex-1 ${index % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                  <div className="bg-dark-card border border-border rounded-2xl p-6 card-glow">
                    <h3 className="font-heading text-xl font-bold mb-2 text-foreground">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>

                {/* Number circle */}
                <div className="relative z-10 flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-bilgi-red flex items-center justify-center shadow-lg shadow-bilgi-red/30">
                    <span className="font-heading text-xl font-bold text-white">{step.number}</span>
                  </div>
                </div>

                {/* Spacer for alternating layout */}
                <div className="hidden md:block flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
