"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
}

type ContactVariant = "modal" | "card"

interface ContactFormProps {
  variant: ContactVariant
  onClose?: () => void
}

function ContactForm({ variant, onClose }: ContactFormProps) {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setErrorMessage("")

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      setStatus("success")
      setFormData({ name: "", email: "", message: "" })

      const reset = () => setStatus("idle")
      if (variant === "modal" && onClose) {
        setTimeout(() => {
          onClose()
          reset()
        }, 2000)
      } else {
        setTimeout(reset, 2000)
      }
    } catch {
      setStatus("error")
      setErrorMessage("Mesaj gönderilemedi. Lütfen tekrar deneyin.")
    }
  }

  const cardClasses =
    "relative bg-dark-card border border-border rounded-2xl p-6 md:p-8 shadow-2xl w-full backdrop-blur-sm"

  return (
    <div className={cardClasses}>
      {variant === "modal" && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Kapat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" x2="6" y1="6" y2="18" />
            <line x1="6" x2="18" y1="6" y2="18" />
          </svg>
        </button>
      )}

      <div className="flex items-start gap-3 mb-2">
        <span className="w-10 h-10 rounded-full text-bilgi-red flex items-center justify-center">
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
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <div>
          <h2 className="font-heading text-2xl font-bold gradient-text">İletişim</h2>
          <p className="text-muted-foreground">
            Soruların, önerilerin veya iş birliği için bize yazabilirsin.
          </p>
        </div>
      </div>

      {status === "success" ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-500"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-foreground font-medium">Mesajın gönderildi!</p>
          <p className="text-muted-foreground text-sm">En kısa sürede dönüş yapacağız.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor={`contact-name-${variant}`}>İsim</Label>
            <Input
              id={`contact-name-${variant}`}
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="mt-1 bg-dark-bg border-border"
              placeholder="Adınız Soyadınız"
            />
          </div>

          <div>
            <Label htmlFor={`contact-email-${variant}`}>E-posta</Label>
            <Input
              id={`contact-email-${variant}`}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="mt-1 bg-dark-bg border-border"
              placeholder="ornek@bilgiedu.net"
            />
          </div>

          <div>
            <Label htmlFor={`contact-message-${variant}`}>Mesaj</Label>
            <Textarea
              id={`contact-message-${variant}`}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              rows={4}
              className="mt-1 bg-dark-bg border-border resize-none"
              placeholder="Mesajını buraya yaz..."
            />
          </div>

          {status === "error" && <p className="text-red-500 text-sm">{errorMessage}</p>}

          <Button type="submit" disabled={status === "loading"} className="w-full btn-bilgi">
            {status === "loading" ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Gönderiliyor...
              </span>
            ) : (
              "Gönder"
            )}
          </Button>
        </form>
      )}
    </div>
  )
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4">
        <ContactForm variant="modal" onClose={onClose} />
      </div>
    </div>
  )
}

export function ContactCard() {
  return (
    <div className="bg-gradient-to-br from-bilgi-red/10 via-dark-card to-gold-accent/10 border border-bilgi-red/20 rounded-3xl p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      <ContactForm variant="card" />
    </div>
  )
}
