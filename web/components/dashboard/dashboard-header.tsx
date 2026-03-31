'use client'

import { CalendarClock, Users, Calendar, Stethoscope, Shield } from 'lucide-react'

interface DashboardHeaderProps {
  greeting: string
  firstName: string
  role: 'vet' | 'admin'
  dateString: string
  quickStats?: {
    waitingCount: number
    todayAppointments: number
  }
}

export function DashboardHeader({
  greeting,
  firstName,
  role,
  dateString,
  quickStats,
}: DashboardHeaderProps): React.ReactElement {
  const RoleIcon = role === 'admin' ? Shield : Stethoscope
  const roleLabel = role === 'admin' ? 'Administrador' : 'Veterinario'

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] p-6 text-white md:p-8">
      {/* Decorative elements */}
      <div className="absolute right-0 top-0 h-48 w-48 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-1/2 translate-y-1/2 rounded-full bg-black/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Greeting Section */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <RoleIcon className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-white/80">{roleLabel}</span>
          </div>
          <h1 className="text-2xl font-bold md:text-3xl">
            {greeting}, {role === 'vet' ? 'Dr. ' : ''}
            {firstName}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-white/80">
            <CalendarClock className="h-4 w-4" />
            {dateString}
          </p>
        </div>

        {/* Quick Stats */}
        {quickStats && (
          <div className="flex gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quickStats.waitingCount}</p>
                <p className="text-xs text-white/70">En espera</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quickStats.todayAppointments}</p>
                <p className="text-xs text-white/70">Citas hoy</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
