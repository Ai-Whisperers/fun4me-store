import { getOwnerPets } from '@/app/actions/pets'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, PawPrint, Search, Calendar } from 'lucide-react'
import { PetCardEnhanced } from '@/components/pets/pet-card-enhanced'

interface Props {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ query?: string }>
}

export default async function PortalPetsPage({
  params,
  searchParams,
}: Props): Promise<React.ReactElement> {
  const { clinic } = await params
  const { query } = await searchParams

  const result = await getOwnerPets(clinic, query)

  if (!result.success) {
    if (result.error === 'Authentication required') {
      redirect(`/${clinic}/portal/login`)
    }

    return (
      <div className="rounded-2xl bg-red-50 p-8 text-center text-red-600">
        <p className="font-bold">Error al cargar mascotas</p>
        <p className="text-sm">{result.error}</p>
      </div>
    )
  }

  const pets = result.data ?? []

  return (
    <div className="page-container-md pb-20">
      {/* Header */}
      <div className="page-header flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">Mis Mascotas</h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            {pets.length} {pets.length === 1 ? 'mascota registrada' : 'mascotas registradas'}
          </p>
        </div>
        <Link href={`/${clinic}/portal/pets/new`} className="btn btn-lg btn-primary-solid">
          <Plus className="h-5 w-5" />
          Nueva Mascota
        </Link>
      </div>

      {/* Search */}
      <form className="page-header-sm">
        <div className="group relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[var(--primary)]" />
          <input
            type="text"
            name="query"
            defaultValue={query}
            placeholder="Buscar mascota por nombre..."
            className="input-base input-with-icon"
          />
        </div>
      </form>

      {/* Empty State */}
      {pets.length === 0 && (
        <div className="card-base empty-state border-2 border-dashed">
          <div className="empty-state-icon h-20 w-20">
            <PawPrint className="h-10 w-10" />
          </div>
          <h3 className="empty-state-title text-xl">
            {query ? 'No se encontraron resultados' : 'Aún no tienes mascotas'}
          </h3>
          <p className="empty-state-description">
            {query
              ? `No encontramos ninguna mascota llamada "${query}"`
              : 'Registra a tus compañeros peludos para llevar un mejor control de su salud'}
          </p>
          {!query && (
            <Link href={`/${clinic}/portal/pets/new`} className="btn btn-lg btn-primary-solid">
              <Plus className="h-5 w-5" />
              Registrar Mascota
            </Link>
          )}
        </div>
      )}

      {/* Pets List */}
      {pets.length > 0 && (
        <div className="space-y-4">
          {pets.map((pet) => (
            <PetCardEnhanced key={pet.id} pet={pet} clinic={clinic} />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="relative mt-12 overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white">
        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/5 blur-3xl"></div>
        <h3 className="relative z-10 mb-4 text-lg font-bold">Acciones Rápidas</h3>
        <div className="relative z-10 grid gap-3 sm:grid-cols-2">
          <Link
            href={`/${clinic}/portal/appointments/new`}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 p-4 transition-all hover:bg-white/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">Agendar Cita</p>
              <p className="text-xs text-white/60">Reserva un horario</p>
            </div>
          </Link>
          <Link
            href={`/${clinic}/portal/pets/new`}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 p-4 transition-all hover:bg-white/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">Nueva Mascota</p>
              <p className="text-xs text-white/60">Añade otro paciente</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
