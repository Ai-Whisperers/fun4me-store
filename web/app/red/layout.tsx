import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Red de Clínicas | Vetic - Veterinarias en Paraguay',
  description:
    'Conoce las veterinarias que confían en Vetic. Presentes en todo Paraguay, desde Asunción hasta Alto Paraná.',
  keywords: [
    'veterinarias Paraguay',
    'clínicas veterinarias',
    'red veterinaria',
    'Vetic Paraguay',
  ],
  openGraph: {
    title: 'Red de Clínicas | Vetic',
    description:
      'Veterinarias de todo Paraguay usan Vetic para gestionar citas, historiales y ventas.',
    type: 'website',
    locale: 'es_PY',
  },
}

export default function RedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Leaflet CSS for map */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      {children}
    </>
  )
}
