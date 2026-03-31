import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Demo | Vetic - Mira el Sistema en Acción',
  description:
    'Agenda una demo gratuita de 30 minutos y descubre cómo Vetic puede transformar la gestión de tu veterinaria. Sin compromiso.',
  keywords: [
    'demo veterinaria',
    'software veterinario demo',
    'prueba gratis veterinaria',
    'Vetic demo',
  ],
  openGraph: {
    title: 'Demo | Vetic - Gestión Veterinaria',
    description:
      'Demo personalizada de 30 minutos. Sin compromiso, sin presión de venta. Descubre Vetic.',
    type: 'website',
    locale: 'es_PY',
  },
}

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
