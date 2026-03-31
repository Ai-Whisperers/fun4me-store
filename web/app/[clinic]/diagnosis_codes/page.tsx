// Server component wrapper for Diagnosis Codes page
import DiagnosisCodesClient from '@/app/[clinic]/diagnosis_codes/client'

export const generateMetadata = async () => ({
  title: 'Códigos de Diagnóstico - Herramienta Clínica',
  description: 'Base de datos de códigos de diagnóstico veterinario VeNom/SNOMED',
  openGraph: {
    title: 'Códigos de Diagnóstico',
    description: 'Gestión de códigos de diagnóstico veterinario',
  },
  twitter: { card: 'summary_large_image' },
})

export default function DiagnosisCodesPage() {
  return <DiagnosisCodesClient />
}
