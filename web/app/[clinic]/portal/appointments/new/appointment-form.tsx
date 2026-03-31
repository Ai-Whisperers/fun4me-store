'use client'

import { useActionState } from 'react'
import { createAppointment } from '@/app/actions/create-appointment'
import Image from 'next/image'
import * as Icons from 'lucide-react'

/**
 * Minimal pet data needed for appointment selection
 */
interface AppointmentPet {
  id: string
  name: string
  photo_url: string | null
}

export default function AppointmentForm({
  pets,
  clinic,
}: {
  pets: AppointmentPet[]
  clinic: string
}) {
  const [state, formAction, isPending] = useActionState(createAppointment, null)

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="clinic" value={clinic} />

      {/* 1. Select Pet */}
      <div>
        <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">
          ¿Para quién es la cita?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {pets.map((pet) => (
            <label key={pet.id} className="cursor-pointer">
              <input type="radio" name="pet_id" value={pet.id} className="peer sr-only" required />
              <div className="peer-checked:bg-[var(--primary)]/5 flex items-center gap-3 rounded-xl border-2 border-gray-100 p-3 transition-all hover:border-gray-200 peer-checked:border-[var(--primary)]">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
                  {pet.photo_url ? (
                    <Image 
                      src={pet.photo_url} 
                      alt={`Foto de ${pet.name}`} 
                      fill
                      sizes="40px"
                      className="object-cover" 
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <Icons.PawPrint className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <span className="font-bold text-gray-700">{pet.name}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 2. Date & Time */}
      <div>
        <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">
          Fecha y Hora Preferida
        </label>
        <input
          type="datetime-local"
          name="start_time"
          required
          className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)]"
          // Min date = today
          min={new Date().toISOString().slice(0, 16)}
        />
        <p className="mt-1 text-xs text-gray-400">Sujeto a confirmación por la veterinaria.</p>
      </div>

      {/* 3. Reason */}
      <div>
        <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">
          Motivo de la visita
        </label>
        <select
          name="reason"
          className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[var(--primary)]"
        >
          <option value="Vacunación">Vacunación</option>
          <option value="Consultation">Consulta General</option>
          <option value="Checkup">Control Sano</option>
          <option value="Deworming">Desparasitación</option>
          <option value="Other">Otro</option>
        </select>
        <textarea
          name="notes"
          placeholder="Detalles adicionales (opcional)..."
          rows={2}
          className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)]"
        ></textarea>
      </div>

      {state && !state.success && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600"
        >
          <Icons.AlertCircle className="h-4 w-4" aria-hidden="true" />
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
      >
        {isPending ? <Icons.Loader2 className="h-5 w-5 animate-spin" /> : 'Solicitar Cita'}
      </button>
    </form>
  )
}
