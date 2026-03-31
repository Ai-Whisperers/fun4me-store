'use client'

import { useActionState } from 'react'
import * as Icons from 'lucide-react'
import { inviteStaff } from '@/app/actions/invite-staff'

export function InviteStaffForm({ clinic }: { clinic: string }) {
  const [state, formAction, isPending] = useActionState(inviteStaff, null)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clinic" value={clinic} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="mb-1 ml-2 block text-xs font-bold uppercase text-gray-400">Email</label>
          <input
            required
            type="email"
            name="email"
            placeholder="doctor@veterinaria.com"
            className="min-h-[48px] w-full rounded-xl border border-transparent bg-gray-50 px-4 py-3 font-medium outline-none transition-all focus:border-[var(--primary)] focus:bg-white"
          />
        </div>
        <div>
          <label className="mb-1 ml-2 block text-xs font-bold uppercase text-gray-400">Cargo</label>
          <select
            name="role"
            className="min-h-[48px] w-full appearance-none rounded-xl border border-transparent bg-gray-50 px-4 py-3 font-bold text-[var(--text-primary)] outline-none transition-all focus:border-[var(--primary)] focus:bg-white"
          >
            <option value="vet">Veterinario</option>
            <option value="admin">Admin</option>
          </select>
        </div>
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

      {state && state.success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-600">
          <Icons.CheckCircle className="h-4 w-4" />
          Invitacion enviada correctamente
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 font-bold text-white transition-all hover:shadow-lg active:scale-95"
      >
        {isPending ? <Icons.Loader2 className="h-5 w-5 animate-spin" /> : 'Enviar Invitacion'}
      </button>
    </form>
  )
}
