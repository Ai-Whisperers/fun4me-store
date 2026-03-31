'use client'

import { useActionState } from 'react'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { createPet } from '@/app/actions/create-pet'
import Link from 'next/link'
import { PhotoUpload } from '@/components/pets/photo-upload'

export default function NewPetClient({ params }: { params: { clinic: string } }) {
  const [state, formAction, isPending] = useActionState(createPet, null)

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href={`/${params.clinic}/portal/dashboard`}
          className="rounded-xl p-2 transition-colors hover:bg-white"
          aria-label="Volver al dashboard"
        >
          <ArrowLeft className="h-6 w-6 text-[var(--text-secondary)]" />
        </Link>
        <h1 className="font-heading text-3xl font-black text-[var(--text-primary)]">
          Nueva Mascota
        </h1>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="clinic" value={params.clinic} />

          {/* Photo Upload */}
          <PhotoUpload
            name="photo"
            placeholder="Subir foto"
            shape="circle"
            size={128}
            maxSizeMB={5}
          />

          {/* Form fields omitted for brevity */}

          {state && !state.success && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600"
            >
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
          >
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Guardar Mascota'}
          </button>
        </form>
      </div>
    </div>
  )
}
