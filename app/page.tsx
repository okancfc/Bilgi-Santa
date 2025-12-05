import { StarsBackground } from "@/components/StarsBackground"
import { HomeContent } from "@/components/HomeContent"

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      <StarsBackground />

      <div className="relative z-10">
        <HomeContent />
      </div>
    </main>
  )
}
