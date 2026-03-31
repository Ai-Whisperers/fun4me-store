import { requireStaff } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { getClinicData } from '@/lib/clinics'
import CatalogApprovalsClient from './client'

interface Props {
  params: Promise<{ clinic: string }>
}

export async function generateStaticParams(): Promise<Array<{ clinic: string }>> {
  return [{ clinic: 'terrapet' }, { clinic: 'petlife' }]
}

export default async function CatalogApprovalsPage({ params }: Props): Promise<React.ReactElement> {
  const { clinic } = await params

  // SEC-006: Require admin authentication
  const { isAdmin } = await requireStaff(clinic)

  if (!isAdmin) {
    notFound()
  }

  const clinicData = await getClinicData(clinic)

  if (!clinicData) {
    notFound()
  }

  return <CatalogApprovalsClient clinic={clinic} />
}
