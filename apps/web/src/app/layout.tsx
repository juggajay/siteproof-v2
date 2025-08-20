import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from '@/components/Providers';
import { DarkModeToggle } from '@/components/theme/DarkModeToggle';
import './globals.css';
import '@/styles/dark-mode.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SiteProof - Construction Site Documentation',
  description: 'Professional construction site proof management and documentation',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SiteProof',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="touch-manipulation">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${inter.className} overscroll-none`}>
        <Providers>
          <div className="fixed top-4 right-4 z-50">
            <DarkModeToggle />
          </div>
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
  );
}
