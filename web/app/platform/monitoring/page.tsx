/**
 * Performance Monitoring Dashboard
 *
 * OPS-002: Platform-wide performance monitoring dashboard
 *
 * Displays real-time metrics including:
 * - System health status
 * - API response times
 * - Database performance
 * - Error rates
 * - Memory usage
 */

import { Metadata } from 'next'
import { MonitoringDashboardClient } from './client'

export const metadata: Metadata = {
  title: 'Monitoreo de Rendimiento | Vete Platform',
  description: 'Panel de monitoreo de rendimiento de la plataforma',
}

export default function MonitoringDashboardPage() {
  return <MonitoringDashboardClient />
}
