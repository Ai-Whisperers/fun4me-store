import { createClient } from '@/lib/supabase/server'
import { PublicPetProfile } from '@/components/public-pet-profile'
import * as Icons from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { assignTag } from '@/app/actions/assign-tag'

// Server Component
export default async function TagPage({ params }: { params: Promise<{ code: string }> }) {
  const supabase = await createClient()
  const { code } = await params

  // 1. Check Tag Status
  const { data: tagInfo, error } = await supabase.rpc('get_pet_by_tag', { tag_code: code })

  // Get tag's tenant_id for proper clinic routing
  const { data: tagData } = await supabase
    .from('qr_tags')
    .select('tenant_id')
    .eq('code', code)
    .single()

  const clinicSlug = tagData?.tenant_id || 'terrapet' // Fallback to terrapet if no tenant

  if (error || !tagInfo || tagInfo.status === 'not_found') {
    // Tag doesn't exist. Redirect to home or show 404.
    // Maybe show a "Claim this tag" if we want to allow registering new IDs?
    // For now, assume tags must be pre-created by Admin.
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Chip/Tag No Encontrado</h1>
        <p>Este código ({code}) no está registrado en nuestro sistema.</p>
        <Link href="/" className="text-blue-500 underline">
          Volver al Inicio
        </Link>
      </div>
    )
  }

  // 2. SCENARIO: ASSIGNED -> SHOW PUBLIC PROFILE
  if (tagInfo.status === 'assigned') {
    return <PublicPetProfile data={tagInfo} />
  }

  // 3. SCENARIO: UNASSIGNED -> ASSIGN FLOW
  if (tagInfo.status === 'unassigned') {
    // Check Auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-8 text-center shadow-xl">
            <div className="bg-[var(--primary)]/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full text-[var(--primary)]">
              <Icons.Link className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-800">Activar Identificador</h1>
              <p className="mt-2 text-gray-500">
                Escaneaste el código <strong>{code}</strong>. <br />
                Inicia sesión para vicularlo a una de tus mascotas.
              </p>
            </div>
            <Link
              href={`/${clinicSlug}/portal/login?redirect=/tag/${code}`}
              className="block w-full rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg transition-transform hover:-translate-y-1"
            >
              Iniciar Sesión / Registrarse
            </Link>
          </div>
        </div>
      )
    }

    // Fetch User's (or Clinic's if Staff) Pets to Assign
    // Simplified: Just fetch pets owned by User
    const { data: myPets } = await supabase
      .from('pets')
      .select('id, name, species, photo_url')
      .eq('owner_id', user.id)

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-8 shadow-xl">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Icons.QrCode className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black text-gray-800">Vincular Identificador</h1>
            <p className="text-gray-500">
              Código:{' '}
              <span className="rounded bg-gray-100 px-2 py-1 font-mono font-bold text-gray-800">
                {code}
              </span>
            </p>
          </div>

          {!myPets || myPets.length === 0 ? (
            <div className="rounded-xl border border-yellow-100 bg-yellow-50 py-6 text-center">
              <p className="mb-2 font-bold text-yellow-700">No tienes mascotas registradas</p>
              <Link
                href={`/${clinicSlug}/portal/pets/new`}
                className="text-sm text-yellow-800 underline"
              >
                Registrar mascota primero
              </Link>
            </div>
          ) : (
            <form
              // @ts-expect-error - Server action returns ActionResult which conflicts with form action types
              action={assignTag} className="space-y-4">
              <input type="hidden" name="tagCode" value={code} />
              <label className="block text-sm font-bold uppercase tracking-wider text-gray-400">
                Selecciona tu Mascota
              </label>
              <div className="max-h-60 space-y-3 overflow-y-auto pr-2">
                {myPets.map((pet) => (
                  <label
                    key={pet.id}
                    className="hover:bg-[var(--primary)]/5 flex cursor-pointer items-center gap-4 rounded-xl border border-gray-200 p-3 transition-all hover:border-[var(--primary)]"
                  >
                    <input
                      type="radio"
                      name="petId"
                      value={pet.id}
                      required
                      className="h-5 w-5 accent-[var(--primary)]"
                    />
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                      {pet.photo_url ? (
                        <Image 
                          src={pet.photo_url} 
                          alt={`Foto de ${pet.name}`} 
                          fill
                          sizes="40px"
                          className="object-cover" 
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <Icons.PawPrint className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="block font-bold text-gray-800">{pet.name}</span>
                      <span className="text-xs uppercase text-gray-500">{pet.species}</span>
                    </div>
                  </label>
                ))}
              </div>
              <button className="mt-4 w-full rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg hover:opacity-90">
                Vincular Ahora
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return <div>Estado desconocido</div>
}
