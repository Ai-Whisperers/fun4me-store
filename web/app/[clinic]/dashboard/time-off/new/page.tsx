import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Send, AlertCircle } from 'lucide-react'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function NewTimeOffPage({ params }: Props): Promise<React.ReactElement> {
  const { clinic } = await params
  const supabase = await createClient()

  // Auth & staff check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role) || profile.tenant_id !== clinic) {
    redirect(`/${clinic}/portal/dashboard`)
  }

  // Get staff profile for this user
  const { data: staffProfile } = await supabase
    .from('staff_profiles')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  // Fetch time-off types
  const { data: timeOffTypes } = await supabase
    .from('staff_time_off_types')
    .select('id, name, paid, max_days')
    .eq('tenant_id', clinic)
    .order('name')

  const typedTypes = (timeOffTypes || []) as {
    id: string
    name: string
    paid: boolean
    max_days: number | null
  }[]

  // Default types if none configured
  const defaultTypes = [
    { id: 'vacation', name: 'Vacaciones', paid: true, max_days: null },
    { id: 'sick', name: 'Enfermedad', paid: true, max_days: null },
    { id: 'personal', name: 'Personal', paid: false, max_days: null },
    { id: 'other', name: 'Otro', paid: false, max_days: null },
  ]

  const availableTypes = typedTypes.length > 0 ? typedTypes : defaultTypes

  // Server action to create request
  async function createTimeOffRequest(formData: FormData): Promise<void> {
    'use server'

    const supabaseServer = (await import('@/lib/supabase/server')).createClient
    const supabase = await supabaseServer()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Verify staff
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['vet', 'admin'].includes(userProfile.role)) return

    // Get staff profile
    const { data: staffProf } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!staffProf) return

    const type = formData.get('type') as string
    const startDate = formData.get('start_date') as string
    const endDate = formData.get('end_date') as string
    const reason = formData.get('reason') as string | null

    // Insert request
    const { error } = await supabase.from('staff_time_off').insert({
      staff_id: staffProf.id,
      type,
      start_date: startDate,
      end_date: endDate,
      reason: reason || null,
      status: 'pending',
    })

    if (error) {
      const { logger } = await import('@/lib/logger')
      logger.error('Error creating time-off request', { error: error.message })
      return
    }

    // Redirect back to list
    const { redirect: redirectFn } = await import('next/navigation')
    redirectFn(`/${clinic}/dashboard/time-off`)
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/${clinic}/dashboard/time-off`}
          className="mb-4 inline-flex items-center gap-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Ausencias
        </Link>

        <div className="flex items-center gap-4">
          <div className="bg-[var(--primary)]/10 flex h-12 w-12 items-center justify-center rounded-xl">
            <Calendar className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">Nueva Solicitud</h1>
            <p className="text-[var(--text-secondary)]">Solicita días libres o vacaciones</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        action={createTimeOffRequest}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
      >
        {/* Type Selection */}
        <div className="border-b border-gray-100 p-6">
          <label
            htmlFor="type"
            className="mb-3 block text-sm font-bold uppercase tracking-wider text-gray-400"
          >
            Tipo de ausencia *
          </label>
          <select
            id="type"
            name="type"
            required
            className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
          >
            {availableTypes.map((type) => (
              <option key={type.id || type.name} value={type.name}>
                {type.name}
                {type.paid && ' (Con goce de sueldo)'}
                {type.max_days && ` - Máx. ${type.max_days} días`}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="grid gap-4 border-b border-gray-100 p-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="start_date"
              className="mb-2 block text-sm font-bold uppercase tracking-wider text-gray-400"
            >
              Fecha inicio *
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                id="start_date"
                name="start_date"
                required
                min={today}
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 outline-none focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="end_date"
              className="mb-2 block text-sm font-bold uppercase tracking-wider text-gray-400"
            >
              Fecha fin *
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                id="end_date"
                name="end_date"
                required
                min={today}
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 outline-none focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="border-b border-gray-100 p-6">
          <label
            htmlFor="reason"
            className="mb-2 block text-sm font-bold uppercase tracking-wider text-gray-400"
          >
            Motivo (opcional)
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            placeholder="Describe brevemente el motivo de tu solicitud..."
            className="focus:ring-[var(--primary)]/20 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
          />
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-3 bg-blue-50 px-6 py-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="text-sm text-blue-700">
            <p className="mb-1 font-bold">Importante</p>
            <p>
              Las solicitudes deben realizarse con al menos 7 días de anticipación. Recibirás una
              notificación cuando tu solicitud sea revisada.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 p-6">
          <Link
            href={`/${clinic}/dashboard/time-off`}
            className="rounded-xl px-6 py-3 font-medium text-[var(--text-secondary)] transition-colors hover:bg-gray-100"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition-opacity hover:opacity-90"
          >
            <Send className="h-4 w-4" />
            Enviar Solicitud
          </button>
        </div>
      </form>
    </div>
  )
}
