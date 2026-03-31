/**
 * Platform Settings Page
 *
 * Manage platform-wide configuration.
 */

import { Metadata } from 'next'
import { PlatformSettingsClient } from './client'

export const metadata: Metadata = {
  title: 'Settings | Vete Platform',
  description: 'Configuración de la plataforma',
}

export default function PlatformSettingsPage() {
  return <PlatformSettingsClient />
}
