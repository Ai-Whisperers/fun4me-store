/**
 * /registro - Clinic Self-Service Signup Page
 *
 * Public page for veterinary clinics to register and create their account.
 * No authentication required.
 */

import type { Metadata } from 'next'
import { SignupWizard } from '@/components/signup/signup-wizard'

export const metadata: Metadata = {
  title: 'Registra tu Clinica | Vetic',
  description:
    'Registra tu clinica veterinaria en Vetic. Prueba gratuita de 90 dias con todas las funcionalidades. Gestiona citas, pacientes, inventario y mas.',
  openGraph: {
    title: 'Registra tu Clinica Veterinaria | Vetic',
    description:
      'Comienza a gestionar tu clinica veterinaria en minutos. Prueba gratuita de 90 dias.',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RegistroPage() {
  return <SignupWizard />
}
