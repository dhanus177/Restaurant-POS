import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { DBProvider } from '@/components/db-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { PWARegister } from '@/components/pwa-register'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const enableVercelAnalytics =
  process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === 'true' || process.env.VERCEL === '1'

export const metadata: Metadata = {
  title: 'Veztra Soft POS',
  description: 'Veztra Soft Restaurant Point of Sale System with Kitchen Display and Inventory Management',
  generator: 'v0.app',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <DBProvider>
            {children}
          </DBProvider>
        </ThemeProvider>
        <PWARegister />
        <Toaster position="top-right" richColors />
        {enableVercelAnalytics ? <Analytics /> : null}
      </body>
    </html>
  )
}
