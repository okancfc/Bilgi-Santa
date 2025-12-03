"use client"

import { useEffect, useState } from "react"

interface Star {
  id: number
  left: number
  top: number
  size: "small" | "medium" | "large"
  delay: number
  duration: number
}

export function StarsBackground() {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    // Generate stars only on client to avoid hydration mismatch
    const generatedStars: Star[] = []
    const starCount = 100

    for (let i = 0; i < starCount; i++) {
      const sizes: ("small" | "medium" | "large")[] = ["small", "medium", "large"]
      generatedStars.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: sizes[Math.floor(Math.random() * 3)],
        delay: Math.random() * 5,
        duration: 2 + Math.random() * 3,
      })
    }

    setStars(generatedStars)
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map((star) => (
        <div
          key={star.id}
          className={`star star-${star.size}`}
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
