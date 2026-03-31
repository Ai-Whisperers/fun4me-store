import { Suspense } from 'react'
import { getClinicData } from '@/lib/clinics'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PrescriptionOrdersClient from './client'

interface Props {
  params: Promise<{ clinic: string }>
}

export async function generateStaticParams() {
  return [{ clinic: 'terrapet' }, { clinic: 'petlife' }]
}

export default async function PrescriptionOrdersPage({ params }: Props) {
  const { clinic } = await params
  const clinicData = await getClinicData(clinic)

  if (!clinicData) {
    notFound()
  }

  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login?returnTo=/${clinic}/dashboard/orders/prescriptions`)
  }

  // Check if user is staff
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'vet' && profile.role !== 'admin')) {
    redirect(`/${clinic}/portal/dashboard`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense
        fallback={
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 rounded bg-gray-200" />
            <div className="h-64 rounded bg-gray-200" />
          </div>
        }
      >
        <PrescriptionOrdersClient clinic={clinic} config={clinicData.config} />
      </Suspense>
    </div>
  )
}
