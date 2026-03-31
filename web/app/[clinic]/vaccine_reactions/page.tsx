// Server component wrapper for Vaccine Reactions page
import VaccineReactionsClient from './client'

export const generateMetadata = async () => ({
  title: 'Reacciones Adversas a Vacunas - Herramienta Clínica',
  description:
    'Registro y monitoreo de reacciones adversas post-vacunación en pacientes veterinarios.',
  openGraph: {
    title: 'Reacciones a Vacunas',
    description: 'Sistema de farmacovigilancia veterinaria',
  },
  twitter: { card: 'summary_large_image' as const },
})

export default function VaccineReactionsPage() {
  return <VaccineReactionsClient />
}
