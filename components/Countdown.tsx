"use client"

import { useEffect, useState } from "react"
import { TARGET_DATE } from "@/lib/constants"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(targetDate: Date, enabled: boolean): TimeLeft {
  if (!enabled) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  const difference = targetDate.getTime() - new Date().getTime()

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  }
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-dark-card border border-border rounded-xl p-4 md:p-6 min-w-[80px] md:min-w-[100px] card-glow">
        <span className="text-3xl md:text-5xl font-bold font-heading gradient-text">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-sm md:text-base text-muted-foreground mt-2 font-medium">{label}</span>
    </div>
  )
}

export function Countdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)
  const [targetDate, setTargetDate] = useState<Date>(TARGET_DATE)
  const [enabled, setEnabled] = useState<boolean>(true)
  const [labelDate, setLabelDate] = useState<string>("14 Şubat 2025")
  const [loadingSettings, setLoadingSettings] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings/countdown")
        if (res.ok) {
          const data = (await res.json()) as { settings?: { start_at?: string | null; enabled?: boolean } }
          if (data?.settings?.start_at) {
            const date = new Date(data.settings.start_at)
            setTargetDate(date)
            setLabelDate(date.toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" }))
          }
          if (typeof data?.settings?.enabled === "boolean") {
            setEnabled(data.settings.enabled)
          }
        }
      } catch (error) {
        console.error("Countdown settings load error:", error)
      } finally {
        setMounted(true)
        setLoadingSettings(false)
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    if (!mounted) return

    setTimeLeft(calculateTimeLeft(targetDate, enabled))

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate, enabled))
    }, 1000)

    return () => clearInterval(timer)
  }, [mounted, targetDate, enabled])

  if (!mounted || loadingSettings) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-8 text-muted-foreground">
            Eşleştirme Başlamasına
          </h2>
          <div className="flex justify-center gap-3 md:gap-6">
            {["Gün", "Saat", "Dakika", "Saniye"].map((label) => (
              <TimeUnit key={label} value={0} label={label} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  const isEventPassed =
    enabled &&
    timeLeft.days === 0 &&
    timeLeft.hours === 0 &&
    timeLeft.minutes === 0 &&
    timeLeft.seconds === 0

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-heading text-2xl md:text-3xl font-bold mb-2">
          {enabled ? (
            isEventPassed ? (
              <span className="gradient-text">Eşleştirmeler Başladı!</span>
            ) : (
              <span className="text-muted-foreground">Eşleştirme Başlamasına</span>
            )
          ) : (
            <span className="text-muted-foreground">Geri sayım henüz başlatılmadı</span>
          )}
        </h2>

        {enabled && !isEventPassed && <p className="text-gold-accent mb-8 font-medium">{labelDate}</p>}

        <div className="flex justify-center gap-3 md:gap-6">
          <TimeUnit value={timeLeft.days} label="Gün" />
          <TimeUnit value={timeLeft.hours} label="Saat" />
          <TimeUnit value={timeLeft.minutes} label="Dakika" />
          <TimeUnit value={timeLeft.seconds} label="Saniye" />
        </div>
      </div>
    </section>
  )
}
