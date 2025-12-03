import { StarsBackground } from "@/components/StarsBackground"
import { Hero } from "@/components/Hero"
import { Countdown } from "@/components/Countdown"
import { StepsSection } from "@/components/StepsSection"
import { HowWeMeetBanner } from "@/components/HowWeMeetBanner"
import { Footer } from "@/components/Footer"

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      <StarsBackground />

      <div className="relative z-10">
        <Hero />
        <Countdown />
        <StepsSection />
        <HowWeMeetBanner />
        <Footer />
      </div>
    </main>
  )
}
