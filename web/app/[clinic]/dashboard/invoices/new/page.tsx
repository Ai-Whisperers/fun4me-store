import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import * as Icons from 'lucide-react'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { getClinicServices, getClinicPets } from '@/app/actions/invoices'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function NewInvoicePage({ params }: Props) {
  const { clinic } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // Staff check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role) || profile.tenant_id !== clinic) {
    redirect(`/${clinic}/portal/dashboard`)
  }

  // Fetch services and pets
  const [servicesResult, petsResult] = await Promise.all([
    getClinicServices(clinic),
    getClinicPets(clinic),
  ])

  const services = servicesResult.success && servicesResult.data ? servicesResult.data : []
  const pets = petsResult.success && petsResult.data ? petsResult.data : []

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={`/${clinic}/dashboard/invoices`}
          className="rounded-lg p-2 transition-colors hover:bg-gray-100"
        >
          <Icons.ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Nueva Factura</h1>
          <p className="text-[var(--text-secondary)]">Crea una nueva factura para un cliente</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-gray-100 bg-white p-6">
        <InvoiceForm clinic={clinic} pets={pets} services={services} mode="create" />
      </div>
    </div>
  )
}
