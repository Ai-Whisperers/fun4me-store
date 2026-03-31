/**
 * Platform Clinics Management Page
 *
 * Manage all tenant clinics from the platform admin interface.
 */

import { Metadata } from 'next'
import { PlatformClinicsClient } from './client'

export const metadata: Metadata = {
  title: 'Manage Clinics | Vete Platform',
  description: 'Administración de clínicas de la plataforma',
}

export default function PlatformClinicsPage() {
  return <PlatformClinicsClient />
}
