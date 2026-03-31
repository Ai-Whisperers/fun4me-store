/**
 * Platform Announcements Management Page
 *
 * Create and manage platform-wide announcements.
 */

import { Metadata } from 'next'
import { PlatformAnnouncementsClient } from './client'

export const metadata: Metadata = {
  title: 'Announcements | Vete Platform',
  description: 'Gestión de anuncios de la plataforma',
}

export default function PlatformAnnouncementsPage() {
  return <PlatformAnnouncementsClient />
}
