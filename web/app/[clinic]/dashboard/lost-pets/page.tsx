import { requireStaff } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { getClinicData } from '@/lib/clinics'
import LostPetsClient from './client'

interface Props {
  params: Promise<{ clinic: string }>
}

export async function generateStaticParams(): Promise<Array<{ clinic: string }>> {
  return [{ clinic: 'terrapet' }, { clinic: 'petlife' }]
}

export default async function LostPetsDashboard({ params }: Props): Promise<React.ReactElement> {
  const { clinic } = await params

  // SEC-006: Require staff authentication with tenant verification
  await requireStaff(clinic)

  const clinicData = await getClinicData(clinic)

  if (!clinicData) {
    notFound()
  }

  return <LostPetsClient clinic={clinic} />
}
