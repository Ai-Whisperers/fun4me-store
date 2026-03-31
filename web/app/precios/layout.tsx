import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Precios | Vetic - Planes para tu Veterinaria',
  description:
    'Solo 2 planes: Gratis y Profesional. Sin costos ocultos, sin contratos. Empezá gratis y pasá a Profesional cuando lo necesites.',
  keywords: [
    'precios veterinaria',
    'software veterinario precio',
    'gestión veterinaria costo',
    'planes veterinaria',
    'Paraguay',
  ],
  openGraph: {
    title: 'Precios | Vetic - Planes para tu Veterinaria',
    description:
      'Solo 2 planes: Gratis y Profesional (Gs 250.000/mes). Empezá gratis y subí cuando lo necesites.',
    type: 'website',
    locale: 'es_PY',
  },
}

export default function PreciosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
