import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  getDayName,
  type DayOfWeek,
  type StaffScheduleEntry,
} from '@/lib/types/calendar'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function StaffSchedulesPage({ params }: Props) {
  const { clinic } = await params
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

  // Fetch staff profiles with schedules
  const { data: staffProfiles } = await supabase
    .from('staff_profiles')
    .select(
      `
      id,
      user_id,
      job_title,
      color_code,
      can_be_booked,
      employment_status
    `
    )
    .eq('tenant_id', clinic)
    .eq('employment_status', 'active')
    .order('created_at')

  // Get user profiles for staff
  const staffUserIds = staffProfiles?.map((sp) => sp.user_id) || []
  const { data: userProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', staffUserIds)

  // Get schedules for all staff
  const staffProfileIds = staffProfiles?.map((sp) => sp.id) || []
  const { data: schedules } = await supabase
    .from('staff_schedules')
    .select(
      `
      id,
      staff_profile_id,
      name,
      is_active,
      effective_from,
      effective_to,
      entries:staff_schedule_entries(
        id,
        day_of_week,
        start_time,
        end_time,
        break_start,
        break_end
      )
    `
    )
    .in('staff_profile_id', staffProfileIds)
    .eq('is_active', true)

  // Merge data
  const staffWithSchedules =
    staffProfiles?.map((sp) => {
      const userProfile = userProfiles?.find((up) => up.id === sp.user_id)
      const staffSchedule = schedules?.find((s) => s.staff_profile_id === sp.id)

      return {
        ...sp,
        full_name: userProfile?.full_name || 'Sin nombre',
        avatar_url: userProfile?.avatar_url,
        schedule: staffSchedule || null,
      }
    }) || []

  // Get pending time off requests count
  const { count: pendingTimeOff } = await supabase
    .from('time_off_requests')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', clinic)
    .eq('status', 'pending')

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Gestión de Horarios</h1>
          <p className="text-[var(--text-secondary)]">
            Administra los horarios de trabajo del personal
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${clinic}/dashboard/calendar`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Ver Calendario
          </Link>
          <Link
            href={`/${clinic}/dashboard/time-off`}
            className="relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Solicitudes de Ausencia
            {pendingTimeOff && pendingTimeOff > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {pendingTimeOff}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Staff list with schedules */}
      <div className="space-y-4">
        {staffWithSchedules.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mb-2 text-lg font-bold text-[var(--text-primary)]">
              No hay personal registrado
            </h3>
            <p className="text-[var(--text-secondary)]">
              Agrega personal a tu clínica para gestionar sus horarios.
            </p>
          </div>
        ) : (
          staffWithSchedules.map((staff) => {
            const entries = (staff.schedule?.entries || []) as StaffScheduleEntry[]
            const sortedEntries = [...entries].sort((a, b) => {
              const order = [1, 2, 3, 4, 5, 6, 0]
              return order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week)
            })

            return (
              <div
                key={staff.id}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white"
              >
                {/* Staff header */}
                <div className="flex items-center justify-between border-b border-gray-100 p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white"
                      style={{ backgroundColor: staff.color_code }}
                    >
                      {staff.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)]">
                        {staff.full_name}
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)]">{staff.job_title}</p>
                    </div>
                    {staff.can_be_booked && (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        Acepta citas
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/${clinic}/dashboard/schedules/${staff.id}`}
                    className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-[var(--primary)] hover:bg-blue-100"
                  >
                    {staff.schedule ? 'Editar Horario' : 'Crear Horario'}
                  </Link>
                </div>

                {/* Schedule display */}
                <div className="p-4">
                  {!staff.schedule || entries.length === 0 ? (
                    <p className="text-sm italic text-gray-400">Sin horario definido</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
                      {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                        const entry = entries.find((e) => e.day_of_week === day)
                        const dayName = getDayName(day as DayOfWeek, true)

                        return (
                          <div
                            key={day}
                            className={`rounded-lg p-3 text-center ${
                              entry ? 'bg-blue-50' : 'bg-gray-50'
                            }`}
                          >
                            <p
                              className={`mb-1 text-xs font-medium ${
                                entry ? 'text-blue-700' : 'text-gray-400'
                              }`}
                            >
                              {dayName}
                            </p>
                            {entry ? (
                              <>
                                <p className="text-sm font-semibold text-gray-900">
                                  {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                                </p>
                                {entry.break_start && entry.break_end && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    Desc: {entry.break_start.slice(0, 5)}-
                                    {entry.break_end.slice(0, 5)}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-xs text-gray-400">Libre</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
