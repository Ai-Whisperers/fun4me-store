import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ScheduleEditorClient } from './schedule-editor-client'
import type { StaffScheduleEntry } from '@/lib/types/calendar'

interface Props {
  params: Promise<{ clinic: string; staffId: string }>
}

export default async function EditStaffSchedulePage({ params }: Props) {
  const { clinic, staffId } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // Admin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || profile.tenant_id !== clinic) {
    redirect(`/${clinic}/dashboard`)
  }

  // Fetch staff profile
  const { data: staffProfile } = await supabase
    .from('staff_profiles')
    .select(
      `
      id,
      user_id,
      job_title,
      color_code,
      can_be_booked,
      tenant_id
    `
    )
    .eq('id', staffId)
    .eq('tenant_id', clinic)
    .single()

  if (!staffProfile) {
    notFound()
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', staffProfile.user_id)
    .single()

  // Get existing schedule
  const { data: schedule } = await supabase
    .from('staff_schedules')
    .select(
      `
      id,
      name,
      effective_from,
      effective_to,
      timezone,
      notes,
      entries:staff_schedule_entries(
        id,
        schedule_id,
        day_of_week,
        start_time,
        end_time,
        break_start,
        break_end,
        location
      )
    `
    )
    .eq('staff_profile_id', staffId)
    .eq('is_active', true)
    .single()

  const staffData = {
    id: staffProfile.id,
    full_name: userProfile?.full_name || 'Sin nombre',
    job_title: staffProfile.job_title,
    color_code: staffProfile.color_code,
    can_be_booked: staffProfile.can_be_booked,
  }

  const scheduleData = schedule
    ? {
        id: schedule.id,
        name: schedule.name,
        effectiveFrom: schedule.effective_from,
        effectiveTo: schedule.effective_to || undefined,
        timezone: schedule.timezone,
        notes: schedule.notes || undefined,
        entries: (schedule.entries || []) as StaffScheduleEntry[],
      }
    : null

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/${clinic}/dashboard/schedules`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Volver a Horarios
        </Link>

        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold text-white"
            style={{ backgroundColor: staffData.color_code }}
          >
            {staffData.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {scheduleData ? 'Editar Horario' : 'Crear Horario'}
            </h1>
            <p className="text-[var(--text-secondary)]">
              {staffData.full_name} - {staffData.job_title}
            </p>
          </div>
        </div>
      </div>

      {/* Schedule Editor */}
      <ScheduleEditorClient
        clinicSlug={clinic}
        staffId={staffId}
        staffData={staffData}
        existingSchedule={scheduleData}
      />
    </div>
  )
}
