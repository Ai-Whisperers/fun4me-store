import { getClinicData } from '@/lib/clinics'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus } from 'lucide-react'
import InviteClientForm from './invite-form'

interface Props {
  params: Promise<{ clinic: string }>
}

export async function generateStaticParams() {
  return [{ clinic: 'terrapet' }, { clinic: 'petlife' }]
}

export default async function InviteClientPage({ params }: Props) {
  const { clinic } = await params

  const clinicData = await getClinicData(clinic)
  if (!clinicData) notFound()

  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${clinic}/portal/login?redirect=/${clinic}/dashboard/clients/invite`)

  // Check staff role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role)) {
    redirect(`/${clinic}/portal/dashboard`)
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/${clinic}/dashboard/clients`}
          className="mb-4 inline-flex items-center gap-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al directorio
        </Link>

        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-[var(--primary)] bg-opacity-10 p-2">
            <UserPlus className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Agregar Nuevo Cliente</h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Registra un nuevo cliente que contactó por WhatsApp. Puedes agregar su mascota ahora o
          después.
        </p>
      </div>

      {/* Form */}
      <InviteClientForm clinic={clinic} config={clinicData.config} />
    </div>
  )
}
