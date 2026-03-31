import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nosotros | Vetic - Tecnología Veterinaria Paraguaya',
  description:
    'Conoce la historia de Vetic. Tecnología veterinaria hecha en Paraguay, diseñada específicamente para las necesidades del mercado local.',
  keywords: [
    'Vetic empresa',
    'software veterinario Paraguay',
    'tecnología veterinaria',
    'empresa paraguaya',
  ],
  openGraph: {
    title: 'Nosotros | Vetic',
    description:
      'Tecnología veterinaria hecha en Paraguay. Conoce nuestra misión y valores.',
    type: 'website',
    locale: 'es_PY',
  },
}

export default function NosotrosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
