import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import * as Icons from 'lucide-react'
import { LabOrderFormWrapper } from '@/components/dashboard/lab-order-form-wrapper'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function NewLabOrderPage({ params }: Props) {
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href={`/${clinic}/dashboard/lab`}
          className="rounded-lg p-2 transition-colors hover:bg-gray-100"
        >
          <Icons.ArrowLeft className="h-6 w-6 text-[var(--text-primary)]" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Nueva Orden de Laboratorio
          </h1>
          <p className="text-[var(--text-secondary)]">
            Selecciona las pruebas y completa la información de la orden
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <LabOrderFormWrapper clinic={clinic} />
      </div>
    </div>
  )
}
