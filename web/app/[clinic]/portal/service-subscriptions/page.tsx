/**
 * Service Subscriptions Portal Page
 *
 * Customer-facing page for managing recurring service subscriptions
 * with optional pickup/delivery service.
 */

import { Metadata } from 'next'
import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import { ServiceSubscriptionsClient } from './client'

interface Props {
  params: Promise<{ clinic: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clinic } = await params
  const clinicData = await getClinicData(clinic)

  return {
    title: `Mis Suscripciones a Servicios | ${clinicData?.config.name || 'Portal'}`,
    description: 'Gestiona tus suscripciones a servicios recurrentes con recogida y entrega a domicilio',
  }
}

export default async function ServiceSubscriptionsPage({ params }: Props) {
  const { clinic } = await params
  const clinicData = await getClinicData(clinic)

  if (!clinicData) {
    notFound()
  }

  return <ServiceSubscriptionsClient clinic={clinic} clinicName={clinicData.config.name} />
}
