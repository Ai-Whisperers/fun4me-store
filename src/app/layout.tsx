import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://fun4me.sunstein.cloud'),
  title: {
    default: 'Fun4Me Store | Tienda Intima en Paraguay',
    template: '%s | Fun4Me Store',
  },
  description:
    'Tu tienda online de productos intimos y de bienestar en Asuncion, Paraguay. Envio discreto a todo el pais. Vibradores, lubricantes, lenceria y mas.',
  keywords: [
    'tienda intima',
    'productos adultos',
    'Paraguay',
    'Asuncion',
    'vibradores',
    'lubricantes',
    'lenceria',
    'bienestar intimo',
    'envio discreto',
    'fun4me',
  ],
  openGraph: {
    type: 'website',
    locale: 'es_PY',
    url: 'https://fun4me.sunstein.cloud',
    siteName: 'Fun4Me Store',
    title: 'Fun4Me Store | Tienda Intima en Paraguay',
    description:
      'Tu tienda online de productos intimos y de bienestar en Asuncion, Paraguay. Envio discreto a todo el pais.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Fun4Me Store',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fun4Me Store | Tienda Intima en Paraguay',
    description:
      'Tu tienda online de productos intimos y de bienestar en Asuncion, Paraguay. Envio discreto a todo el pais.',
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    'theme-color': '#ec4899',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
