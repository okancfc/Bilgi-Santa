import Image from "next/image"

interface FloatingIconButtonProps {
  href: string
  imageUrl?: string
  altText?: string
  external?: boolean
}

export function FloatingIconButton({ href, imageUrl, altText = "Icon", external = false }: FloatingIconButtonProps) {
  const buttonContent = (
    <div className="relative">
      {/* Outer glow */}
      <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-bilgi-red/35 via-bilgi-red/15 to-gold-accent/15 blur-3xl opacity-80 group-hover:blur-[30px] group-hover:opacity-100 transition-all duration-500" />

      {/* Soft ring */}
      <div className="absolute inset-0 rounded-full border border-bilgi-red/30 bg-bilgi-red/5 blur-lg opacity-80 group-hover:border-bilgi-red/50 group-hover:opacity-100 transition-all duration-500" />

      {/* Button */}
      <div className="relative w-12 h-12 rounded-full bg-gradient-to-b from-dark-card to-dark-bg-lighter border border-white/10 ring-2 ring-bilgi-red/35 ring-offset-2 ring-offset-black shadow-[0_14px_40px_rgba(0,0,0,0.6),0_0_28px_rgba(227,30,36,0.45)] flex items-center justify-center group-hover:ring-bilgi-red/65 group-hover:shadow-[0_18px_48px_rgba(0,0,0,0.65),0_0_38px_rgba(227,30,36,0.6)] group-hover:-translate-y-1 group-hover:scale-105 transition-all duration-300 backdrop-blur-sm overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.12),transparent_55%)]" />
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={altText}
            width={64}
            height={64}
            className="w-full h-full object-cover"
          />
        ) : (
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
            className="text-bilgi-red group-hover:text-white transition-colors"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        )}
      </div>
    </div>
  )

  // External link (opens in new tab)
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 md:bottom-8 md:left-8 z-40 group"
        aria-label={altText}
      >
        {buttonContent}
      </a>
    )
  }

  // Internal link
  return (
    <a
      href={href}
      className="fixed bottom-6 left-6 md:bottom-8 md:left-8 z-40 group"
      aria-label={altText}
    >
      {buttonContent}
    </a>
  )
}
