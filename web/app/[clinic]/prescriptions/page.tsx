// Server component wrapper for Prescriptions page
import PrescriptionsClient from './client'

export const generateMetadata = async () => ({
  title: 'Recetas Médicas - Sistema Veterinario',
  description: 'Gestión de recetas y prescripciones médicas veterinarias.',
  openGraph: { title: 'Recetas Médicas', description: 'Sistema de prescripciones veterinarias' },
  twitter: { card: 'summary_large_image' as const },
})

export default function PrescriptionsPage() {
  return <PrescriptionsClient />
}
