import NewRecordForm from './NewRecordForm'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import * as Icons from 'lucide-react'
import Link from 'next/link'

export default async function NewRecordPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string }>
}) {
  const supabase = await createClient()
  const { clinic, id } = await params

  // Fetch Pet basic info for context
  const { data: pet } = await supabase
    .from('pets')
    .select('name, weight_kg, species')
    .eq('id', id)
    .single()

  if (!pet) notFound()

  return (
    <div className="mx-auto max-w-2xl pb-20">
      <div className="mb-8">
        <Link
          href={`/${clinic}/portal/pets/${id}`}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-[var(--primary)]"
        >
          <Icons.ArrowLeft className="h-4 w-4" /> Volver al Perfil
        </Link>
        <h1 className="text-3xl font-black text-[var(--text-primary)]">Nuevo Registro Médico</h1>
        <p className="text-[var(--text-secondary)]">
          Agregando historial para{' '}
          <span className="font-bold text-[var(--primary)]">{pet.name}</span>
        </p>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-lg">
        <NewRecordForm clinic={clinic} petId={id} initialWeight={pet.weight_kg} />
      </div>
    </div>
  )
}
