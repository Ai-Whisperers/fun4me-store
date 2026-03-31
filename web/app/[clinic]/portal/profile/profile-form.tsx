'use client'

import { useActionState } from 'react'
import * as Icons from 'lucide-react'
import { updateProfile } from '@/app/actions/update-profile'
import type { Profile } from '@/lib/types/entities/profile'

function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="flex min-h-[48px] items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl disabled:pointer-events-none disabled:opacity-70 sm:px-8"
    >
      {isPending ? (
        <Icons.Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Icons.Save className="h-5 w-5" />
      )}
      Guardar Cambios
    </button>
  )
}

interface ProfileFormProps {
  clinic: string
  profile: Profile
  success?: boolean
}

export function ProfileForm({ clinic, profile, success }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, null)

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-lg sm:p-6 md:p-8">
      {success && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-4 text-green-700">
          <Icons.CheckCircle2 className="h-5 w-5" />
          <span className="font-bold">¡Perfil actualizado correctamente!</span>
        </div>
      )}

      {state && !state.success && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700">
          <Icons.AlertCircle className="h-5 w-5" />
          <span className="font-bold">{state.error}</span>
        </div>
      )}

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="clinic" value={clinic} />

        <div className="flex flex-col items-center gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:gap-6">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-2xl font-bold text-gray-300 sm:h-24 sm:w-24 sm:text-3xl">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="h-full w-full rounded-full object-cover"
                alt=""
              />
            ) : (
              profile?.full_name?.[0] || <Icons.User className="h-8 w-8 sm:h-10 sm:w-10" />
            )}
          </div>
          <div className="text-center sm:text-left">
            <h3 className="break-all text-base font-bold text-gray-800 sm:text-lg">
              {profile?.email}
            </h3>
            <span className="bg-[var(--primary)]/10 mt-1 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase text-[var(--primary)]">
              {profile?.role === 'owner' ? 'Propietario' : profile?.role}
            </span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-500">Nombre Completo</label>
            <input
              name="full_name"
              defaultValue={profile?.full_name || ''}
              className={`min-h-[48px] w-full rounded-xl border p-3 font-bold text-gray-700 outline-none focus:border-[var(--primary)] ${
                state && !state.success && state.fieldErrors?.full_name
                  ? 'border-red-300'
                  : 'border-gray-200'
              }`}
            />
            {state && !state.success && state.fieldErrors?.full_name && (
              <p className="mt-1 text-sm text-red-500">{state.fieldErrors.full_name}</p>
            )}
          </div>
          {/* Empty col for spacing or future use */}
          <div className="hidden md:block"></div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-500">Teléfono Principal</label>
            <input
              name="phone"
              defaultValue={profile?.phone || ''}
              placeholder="+595 9..."
              className={`min-h-[48px] w-full rounded-xl border p-3 font-bold text-gray-700 outline-none focus:border-[var(--primary)] ${
                state && !state.success && state.fieldErrors?.phone
                  ? 'border-red-300'
                  : 'border-gray-200'
              }`}
            />
            {state && !state.success && state.fieldErrors?.phone && (
              <p className="mt-1 text-sm text-red-500">{state.fieldErrors.phone}</p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-500">
              Teléfono Secundario
            </label>
            <input
              name="secondary_phone"
              defaultValue={profile?.secondary_phone || ''}
              placeholder="Opcional"
              className={`min-h-[48px] w-full rounded-xl border p-3 font-bold text-gray-700 outline-none focus:border-[var(--primary)] ${
                state && !state.success && state.fieldErrors?.secondary_phone
                  ? 'border-red-300'
                  : 'border-gray-200'
              }`}
            />
            {state && !state.success && state.fieldErrors?.secondary_phone && (
              <p className="mt-1 text-sm text-red-500">{state.fieldErrors.secondary_phone}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-bold text-gray-500">Dirección</label>
            <input
              name="address"
              defaultValue={profile?.address || ''}
              placeholder="Calle Principal 123"
              className={`min-h-[48px] w-full rounded-xl border p-3 font-bold text-gray-700 outline-none focus:border-[var(--primary)] ${
                state && !state.success && state.fieldErrors?.address
                  ? 'border-red-300'
                  : 'border-gray-200'
              }`}
            />
            {state && !state.success && state.fieldErrors?.address && (
              <p className="mt-1 text-sm text-red-500">{state.fieldErrors.address}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-bold text-gray-500">Ciudad / Barrio</label>
            <input
              name="city"
              defaultValue={profile?.city || ''}
              placeholder="Asunción"
              className={`min-h-[48px] w-full rounded-xl border p-3 font-bold text-gray-700 outline-none focus:border-[var(--primary)] ${
                state && !state.success && state.fieldErrors?.city
                  ? 'border-red-300'
                  : 'border-gray-200'
              }`}
            />
            {state && !state.success && state.fieldErrors?.city && (
              <p className="mt-1 text-sm text-red-500">{state.fieldErrors.city}</p>
            )}
          </div>
        </div>

        <div className="flex justify-center pt-4 sm:justify-end">
          <SubmitButton isPending={isPending} />
        </div>
      </form>
    </div>
  )
}
