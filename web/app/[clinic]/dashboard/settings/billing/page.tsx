import { Suspense } from 'react'
import { getClinicData } from '@/lib/clinics'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { BillingClient } from './client'

interface BillingPageProps {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ tab?: string; pay?: string }>
}

export const metadata = {
  title: 'Facturacion | Configuracion',
}

function LoadingState(): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-gray-200" />
        <div className="mt-2 h-4 w-64 rounded bg-gray-200" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b border-gray-200 pb-2">
        <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200" />
      </div>

      {/* Content skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
      </div>
    </div>
  )
}

export default async function BillingPage({
  params,
  searchParams,
}: BillingPageProps): Promise<React.ReactElement> {
  const { clinic } = await params
  const { tab, pay } = await searchParams
  const clinicData = await getClinicData(clinic)

  if (!clinicData) {
    notFound()
  }

  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // Profile check (admin only)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || profile.tenant_id !== clinic) {
    redirect(`/${clinic}/dashboard`)
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Facturacion y Pagos</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Gestiona tu suscripcion, metodos de pago y facturas
        </p>
      </div>

      <Suspense fallback={<LoadingState />}>
        <BillingClient clinic={clinic} initialTab={tab} payInvoiceId={pay} />
      </Suspense>
    </div>
  )
}
