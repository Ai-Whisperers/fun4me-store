// Server component wrapper for Growth Charts page
import GrowthChartsClient from '@/app/[clinic]/growth_charts/client'

export const generateMetadata = async () => ({
  title: 'Curvas de Crecimiento - Herramienta Clínica',
  description:
    'Monitorea el crecimiento de tus pacientes. Registra peso por edad y raza para detectar anomalías tempranas.',
  openGraph: {
    title: 'Curvas de Crecimiento',
    description: 'Herramienta de monitoreo de crecimiento veterinario',
  },
  twitter: { card: 'summary_large_image' },
})

export default function GrowthChartsPage() {
  return <GrowthChartsClient />
}
