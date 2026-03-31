import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import * as Icons from 'lucide-react'

import { ReportFoundButton } from '@/components/safety/report-found-button'

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: petId } = await params
  const supabase = await createClient()

  // 1. Fetch Pet (Public if Active QR)
  const { data: pet, error: petError } = await supabase
    .from('pets')
    .select(
      `
            id,
            name,
            species,
            breed,
            photo_url,
            microchip_number,
            allergies,
            existing_conditions,
            owner_id
        `
    )
    .eq('id', petId)
    .single()

  if (petError || !pet) {
    return notFound()
  }

  // 2. Fetch Owner (Public if linked to Pet with Active QR)
  const { data: owner } = await supabase
    .from('profiles')
    .select('full_name, phone, email')
    .eq('id', pet.owner_id)
    .single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <Icons.ShieldCheck className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="mb-2 text-4xl font-black text-gray-900">Mascota Encontrada</h1>
          <p className="text-gray-600">Información de contacto del dueño</p>
        </div>

        {/* Pet Card */}
        <div className="mb-6 overflow-hidden rounded-[3rem] border border-gray-100 bg-white shadow-2xl">
          {/* Pet Photo */}
          {pet.photo_url && (
            <div className="relative h-64 overflow-hidden bg-gray-100">
              <Image 
                src={pet.photo_url} 
                alt={pet.name} 
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-cover" 
              />
            </div>
          )}

          <div className="p-8">
            {/* Pet Info */}
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-3xl font-black text-gray-900">{pet.name}</h2>
              <p className="text-lg text-gray-600">
                {pet.species} • {pet.breed}
              </p>
              {pet.microchip_number && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                  <Icons.Cpu className="h-4 w-4" />
                  Microchip: {pet.microchip_number}
                </div>
              )}
            </div>

            {/* Medical Alerts */}
            {(pet.allergies || pet.existing_conditions) && (
              <div className="mb-8 rounded-2xl border-2 border-red-200 bg-red-50 p-6">
                <h3 className="mb-3 flex items-center gap-2 font-black text-red-900">
                  <Icons.AlertTriangle className="h-5 w-5" />
                  Alertas Médicas
                </h3>
                {pet.allergies && (
                  <div className="mb-2">
                    <span className="font-bold text-red-800">Alergias:</span>
                    <span className="ml-2 text-red-700">{pet.allergies}</span>
                  </div>
                )}
                {pet.existing_conditions && (
                  <div>
                    <span className="font-bold text-red-800">Condiciones:</span>
                    <span className="ml-2 text-red-700">{pet.existing_conditions}</span>
                  </div>
                )}
              </div>
            )}

            {/* Owner Contact */}
            <div className="bg-[var(--primary)]/5 border-[var(--primary)]/20 mb-6 rounded-2xl border p-6">
              <h3 className="mb-4 flex items-center gap-2 font-black text-gray-900">
                <Icons.User className="h-5 w-5 text-[var(--primary)]" />
                Contacto del Dueño
              </h3>
              <div className="space-y-3">
                {owner?.full_name && (
                  <div className="flex items-center gap-3">
                    <Icons.User className="h-5 w-5 text-gray-400" />
                    <span className="font-bold text-gray-900">{owner.full_name}</span>
                  </div>
                )}
                {owner?.phone && (
                  <a
                    href={`tel:${owner.phone}`}
                    className="flex items-center gap-3 font-bold text-[var(--primary)] hover:underline"
                  >
                    <Icons.Phone className="h-5 w-5" />
                    {owner.phone}
                  </a>
                )}
                {owner?.email && (
                  <a
                    href={`mailto:${owner.email}`}
                    className="flex items-center gap-3 font-bold text-[var(--primary)] hover:underline"
                  >
                    <Icons.Mail className="h-5 w-5" />
                    {owner.email}
                  </a>
                )}
              </div>
            </div>

            {/* Call to Action */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                {owner?.phone && (
                  <a
                    href={`tel:${owner.phone}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-green-600 px-8 py-5 text-center font-black text-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl"
                  >
                    <Icons.Phone className="h-5 w-5" />
                    Llamar al Dueño
                  </a>
                )}
                {owner?.phone && (
                  <a
                    href={`https://wa.me/${owner.phone.replace(/\D/g, '')}?text=Hola, encontré a ${pet.name}!`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-8 py-5 text-center font-black text-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl"
                  >
                    <Icons.MessageCircle className="h-5 w-5" />
                    WhatsApp
                  </a>
                )}
              </div>

              <ReportFoundButton petId={pet.id} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p className="mb-2">¿Encontraste esta mascota perdida?</p>
          <p>Gracias por ayudar a reunir a {pet.name} con su familia ❤️</p>
        </div>
      </div>
    </div>
  )
}
