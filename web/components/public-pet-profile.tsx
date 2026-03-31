import * as Icons from 'lucide-react'
import Link from 'next/link'

interface PublicPetProfileProps {
  data: {
    status: string
    pet: {
      name: string
      species: string
      breed: string
      photo_url: string | null
      diet_notes: string | null
    }
    owner: {
      name: string
      phone: string
    }
    vaccine_status: 'up_to_date' | 'needs_check' | 'unknown'
  }
}

export function PublicPetProfile({ data }: PublicPetProfileProps) {
  const { pet, owner, vaccine_status } = data

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl">
        {/* Header Status */}
        <div
          className={`flex items-center justify-center gap-2 p-4 text-center text-sm font-bold uppercase tracking-widest text-white ${
            vaccine_status === 'up_to_date' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {vaccine_status === 'up_to_date' ? (
            <>
              <Icons.CheckCircle2 className="h-5 w-5" /> Vacunas al Día
            </>
          ) : (
            <>
              <Icons.AlertTriangle className="h-5 w-5" /> Verificar Vacunas
            </>
          )}
        </div>

        {/* Pet Photo */}
        <div className="relative flex justify-center pb-4 pt-8">
          <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-lg">
            {pet.photo_url ? (
              <img src={pet.photo_url} alt={pet.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                <Icons.PawPrint className="h-16 w-16" />
              </div>
            )}
          </div>
        </div>

        {/* Pet Info */}
        <div className="border-b border-gray-100 px-6 pb-6 text-center">
          <h1 className="mb-1 text-3xl font-black text-gray-800">{pet.name}</h1>
          <p className="flex items-center justify-center gap-2 text-sm font-medium uppercase tracking-wider text-gray-500">
            {pet.species === 'dog' ? (
              <Icons.Dog className="h-4 w-4" />
            ) : (
              <Icons.Cat className="h-4 w-4" />
            )}
            {pet.breed || 'Mestizo'}
          </p>
        </div>

        {/* Owner Info */}
        <div className="space-y-4 bg-gray-50/50 p-6">
          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Icons.User className="h-5 w-5" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400">Propietario</label>
              <span className="font-bold text-gray-800">{owner.name}</span>
            </div>
          </div>

          <a href={`tel:${owner.phone}`} className="block w-full">
            <div className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl bg-green-500 p-4 text-white shadow-lg transition-all hover:bg-green-600 hover:shadow-xl">
              <Icons.Phone className="h-6 w-6" />
              <div className="text-left">
                <span className="block text-xs font-bold uppercase opacity-80">Llamar Ahora</span>
                <span className="text-lg font-black">{owner.phone}</span>
              </div>
            </div>
          </a>

          <a
            href={`https://wa.me/${owner.phone?.replace(/\+/g, '')}`}
            target="_blank"
            className="block w-full" rel="noreferrer"
          >
            <div className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl bg-[#25D366] p-4 text-white shadow-lg transition-all hover:opacity-90 hover:shadow-xl">
              <Icons.MessageCircle className="h-6 w-6" />
              <span className="text-lg font-black">WhatsApp</span>
            </div>
          </a>
        </div>

        {/* Diet / Notes */}
        {pet.diet_notes && (
          <div className="border-t border-gray-100 p-6">
            <h3 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-gray-400">
              <Icons.Utensils className="h-3 w-3" /> Dieta / Cuidados
            </h3>
            <p className="rounded-xl border border-yellow-100 bg-yellow-50 p-3 text-sm text-gray-600">
              {pet.diet_notes}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-1 text-xs font-bold text-gray-400 hover:text-[var(--primary)]"
          >
            <Icons.ShieldCheck className="h-3 w-3" /> Identificado con Adris
          </Link>
        </div>
      </div>
    </div>
  )
}
