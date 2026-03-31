/**
 * Platform Dashboard Page
 *
 * Overview page for platform administrators showing cross-tenant metrics.
 */

import { Metadata } from 'next'
import { PlatformDashboardClient } from './client'

export const metadata: Metadata = {
  title: 'Platform Dashboard | Vete',
  description: 'Panel de administración de la plataforma',
}

export default function PlatformDashboardPage() {
  return <PlatformDashboardClient />
}
