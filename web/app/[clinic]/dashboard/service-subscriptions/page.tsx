/**
 * Service Subscriptions Dashboard
 *
 * Staff management page for recurring service subscriptions,
 * pickup/delivery routes, and driver assignments.
 */

import { Metadata } from 'next'
import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import { ServiceSubscriptionsDashboard } from './client'

interface Props {
  params: Promise<{ clinic: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clinic } = await params
  const clinicData = await getClinicData(clinic)

  return {
    title: `Suscripciones a Servicios | ${clinicData?.config.name || 'Dashboard'}`,
    description: 'Gestiona suscripciones recurrentes, rutas de recogida y entrega',
  }
}

export default async function ServiceSubscriptionsPage({ params }: Props) {
  const { clinic } = await params
  const clinicData = await getClinicData(clinic)

  if (!clinicData) {
    notFound()
  }

  return <ServiceSubscriptionsDashboard clinic={clinic} />
}
