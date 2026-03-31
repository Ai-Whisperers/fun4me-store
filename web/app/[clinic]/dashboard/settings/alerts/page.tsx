import { requireStaff } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { getClinicData } from '@/lib/clinics'
import AlertSettingsClient from './client'

interface Props {
  params: Promise<{ clinic: string }>
}

export async function generateStaticParams(): Promise<Array<{ clinic: string }>> {
  return [{ clinic: 'terrapet' }, { clinic: 'petlife' }]
}

export default async function AlertSettingsPage({ params }: Props): Promise<React.ReactElement> {
  const { clinic } = await params

  // SEC-006: Require staff authentication
  await requireStaff(clinic)

  const clinicData = await getClinicData(clinic)

  if (!clinicData) {
    notFound()
  }

  return <AlertSettingsClient clinic={clinic} />
}
