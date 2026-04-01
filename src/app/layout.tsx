import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const dmSans = DM_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  axes: ['opsz'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'actions.xyz',
  description: 'Real-time meeting action item pipeline',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable} h-full`}>
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: 'var(--font-body)', background: 'var(--ocean-900)' }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
