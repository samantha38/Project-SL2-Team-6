import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'

const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'CleanKiln DT — Industrial Air Quality Dashboard',
  description: 'Real-time ESP32 sensor monitoring with AI-powered environmental analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.className} bg-surface antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
