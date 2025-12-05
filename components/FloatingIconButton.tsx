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
      {/* Glow effect */}
      <div className="absolute inset-0 bg-bilgi-red/30 rounded-full blur-xl group-hover:bg-bilgi-red/40 transition-all duration-300" />
      
      {/* Button */}
      <div className="relative w-14 h-14 rounded-full bg-dark-card border-2 border-bilgi-red/50 flex items-center justify-center group-hover:border-bilgi-red group-hover:scale-110 transition-all duration-300 backdrop-blur-sm overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={altText}
            width={56}
            height={56}
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
