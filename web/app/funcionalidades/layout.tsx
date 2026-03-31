import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Funcionalidades | Vetic - Gestión Veterinaria',
  description:
    'Descubre todas las funcionalidades de Vetic: agenda, historial clínico, tienda online, facturación SET y reportes. Todo lo que necesitas para gestionar tu veterinaria.',
  keywords: [
    'software veterinario',
    'gestión veterinaria',
    'agenda veterinaria',
    'historial clínico',
    'facturación SET',
    'Paraguay',
  ],
  openGraph: {
    title: 'Funcionalidades | Vetic - Gestión Veterinaria',
    description:
      'Agenda, historial clínico, tienda online, facturación y reportes. Todo en una plataforma diseñada para veterinarias paraguayas.',
    type: 'website',
    locale: 'es_PY',
  },
}

export default function FuncionalidadesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
