import { requireStaff } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { getClinicData } from '@/lib/clinics'
import LostPetDetailClient from './client'

interface Props {
  params: Promise<{ clinic: string; id: string }>
}

export async function generateStaticParams(): Promise<Array<{ clinic: string; id: string }>> {
  return []
}

export default async function LostPetDetailPage({ params }: Props): Promise<React.ReactElement> {
  const { clinic, id } = await params
  await requireStaff(clinic)
  const clinicData = await getClinicData(clinic)

  if (!clinicData) {
    notFound()
  }

  return <LostPetDetailClient clinic={clinic} reportId={id} />
}
