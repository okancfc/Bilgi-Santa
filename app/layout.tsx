import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Poppins } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Bilgi Santa - İstanbul Bilgi Üniversitesi Gizli Arkadaş",
  description:
    "İstanbul Bilgi Üniversitesi öğrencileri için anonim hediye eşleştirme ve buluşma platformu. Yeni arkadaşlıklar kur, sürpriz hediyeler al!",
  keywords: ["Bilgi Üniversitesi", "gizli arkadaş", "hediye", "eşleştirme", "öğrenci"],
  authors: [{ name: "Bilgi Santa Team" }],
  openGraph: {
    title: "Bilgi Santa 2026",
    description: "Bilgi Üniversitesi Gizli Arkadaş Eşleştirme Platformu",
    type: "website",
  },
    generator: 'v0.app'
}

export const viewport: Viewport = {
  themeColor: "#E31E24",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className="dark">
      <body className={`${inter.variable} ${poppins.variable} font-sans antialiased min-h-screen`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
