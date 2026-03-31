import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import * as Icons from 'lucide-react'
import NetworkSearch from './NetworkSearch'
import PatientRequestButton from './PatientRequestButton'

/** Patient search result from RPC or local query */
interface PatientSearchResult {
  id: string
  name: string
  species: string
  breed: string | null
  photo_url: string | null
  owner_name: string | null
  owner_phone: string | null
  is_local: boolean
  has_access: boolean
  home_clinic_id?: string
  home_clinic_name?: string
}

export default async function PatientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ query?: string; scope?: string }>
}) {
  const supabase = await createClient()
  const { clinic } = await params
  const { query, scope } = await searchParams
  const isGlobal = scope === 'global'
  const searchQuery = query || ''

  // Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${clinic}/portal/login`)

  // Role Check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  const isStaff = profile?.role === 'vet' || profile?.role === 'admin'
  if (!isStaff) {
    return (
      <div className="p-8 text-center font-bold text-red-500">
        Acceso Denegado. Solo personal autorizado.
      </div>
    )
  }

  // Fetch Data (using RPC for both local and global to unify structure, or standard query for local)
  // We will use the new `search_pets_global` RPC for BOTH, as it handles the "is_local" logic perfectly.
  // If scope is local, we can just filter in the UI or pass a flag?
  // actually `search_pets_global` returns EVERYTHING matching the query.
  // Ideally we filter by `is_local` if scope is local.
  // But `search_pets_global` requires a query string. If empty, it might return nothing?

  let pets: PatientSearchResult[] = []
  let error = null

  if (searchQuery) {
    const { data, error: err } = await supabase.rpc('search_pets_global', {
      search_query: searchQuery,
      requesting_clinic_id: clinic, // assumes clinic param matches tenant_id (e.g. 'terrapet')
    })
    if (err) error = err
    else pets = data || []
  } else if (!isGlobal) {
    // Default Local View (Recent Pets) if no query
    const { data } = await supabase
      .from('pets')
      .select('*, profiles(full_name, phone)')
      .eq('tenant_id', clinic)
      .order('created_at', { ascending: false })
      .limit(20)

    // Map to match RPC structure
    pets =
      data?.map((p) => ({
        id: p.id,
        name: p.name,
        species: p.species,
        breed: p.breed,
        photo_url: p.photo_url,
        owner_name: p.profiles?.full_name,
        owner_phone: p.profiles?.phone,
        is_local: true,
        has_access: true,
      })) || []
  }

  // Filter by Scope if Query was used
  if (searchQuery && !isGlobal) {
    pets = pets.filter((p) => p.is_local || p.has_access)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
          <Link
            href={`/${clinic}/portal/dashboard`}
            className="text-gray-400 hover:text-[var(--primary)]"
          >
            Dashboard
          </Link>
          <Icons.ChevronRight className="h-4 w-4" />
          <span className="font-bold text-[var(--primary)]">Pacientes</span>
        </div>
        <h1 className="font-heading text-3xl font-black text-[var(--text-primary)]">
          Directorio de Pacientes
        </h1>
        <p className="text-[var(--text-secondary)]">
          Gestiona tus pacientes locales o busca en la Red Global.
        </p>
      </div>

      {/* Search & Toggle */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <NetworkSearch />
      </div>

      {/* Results */}
      <div className="space-y-4">
        {searchQuery && (
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Resultados para "{searchQuery}" ({pets.length})
          </h3>
        )}

        <div className="grid gap-4">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${
                pet.is_local
                  ? 'border-gray-100 bg-white shadow-sm hover:shadow-md'
                  : 'border-gray-200 bg-gray-50 opacity-90'
              }`}
            >
              {/* Avatar */}
              <div className="relative">
                {pet.photo_url ? (
                  <img
                    src={pet.photo_url}
                    alt={pet.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-gray-400">
                    <Icons.PawPrint className="h-8 w-8" />
                  </div>
                )}
                {!pet.is_local && !pet.has_access && (
                  <div
                    className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-gray-600 p-1 text-white"
                    title="Red Externa"
                  >
                    <Icons.Globe className="h-3 w-3" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">{pet.name}</h3>
                  {pet.is_local && (
                    <span className="bg-[var(--primary)]/10 rounded-full px-2 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                      LOCAL
                    </span>
                  )}
                </div>
                <p className="text-sm capitalize text-[var(--text-secondary)]">
                  {pet.species} • {pet.breed || 'Mestizo'}
                </p>
              </div>

              {/* Privacy / Owner */}
              <div className="mr-4 text-right">
                {pet.has_access ? (
                  <>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{pet.owner_name}</p>
                    <p className="text-xs text-gray-500">{pet.owner_phone}</p>
                  </>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-400">
                      <Icons.Lock className="h-3 w-3" /> Privado
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div>
                {pet.has_access ? (
                  <Link
                    href={`/${clinic}/portal/pets/${pet.id}`}
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  >
                    Ver Ficha
                  </Link>
                ) : (
                  <PatientRequestButton petId={pet.id} clinicId={clinic} />
                )}
              </div>
            </div>
          ))}

          {pets.length === 0 && searchQuery && (
            <div className="py-12 text-center text-gray-400">
              <Icons.SearchX className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p>No se encontraron pacientes con ese nombre.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
