import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import * as Icons from 'lucide-react'
import AppointmentForm from './appointment-form'

export default async function NewAppointmentPage({
  params,
}: {
  params: Promise<{ clinic: string }>
}) {
  const supabase = await createClient()
  const { clinic } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${clinic}/portal/login`)

  // Fetch Owner's Pets
  const { data: pets } = await supabase
    .from('pets')
    .select('id, name, species, photo_url')
    .eq('owner_id', user.id)
    .eq('tenant_id', clinic) // Ensure correct clinic context

  if (!pets || pets.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
          <Icons.AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">No tienes mascotas registradas</h1>
        <p className="mb-6 text-gray-500">Debes registrar una mascota antes de agendar una cita.</p>
        <Link
          href={`/${clinic}/portal/pets/new`}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white shadow-lg transition-all hover:shadow-xl"
        >
          <Icons.Plus className="h-5 w-5" /> Registrar Mascota
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href={`/${clinic}/portal/dashboard`}
          className="rounded-xl p-2 transition-colors hover:bg-white"
        >
          <Icons.ArrowLeft className="h-6 w-6 text-[var(--text-secondary)]" />
        </Link>
        <h1 className="font-heading text-3xl font-black text-[var(--text-primary)]">
          Agendar Cita
        </h1>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
        <AppointmentForm pets={pets} clinic={clinic} />
      </div>
    </div>
  )
}
