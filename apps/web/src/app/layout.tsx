import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from '@/components/Providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SiteProof - Construction Site Documentation',
  description: 'Professional construction site proof management and documentation',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster 
            position="bottom-right"
            toastOptions={{
              className: 'font-medium',
              duration: 4000,
            }}
            richColors
            closeButton
          />
        </Providers>
      </body>
    </html>
  )
}