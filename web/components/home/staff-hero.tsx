'use client'

import Link from 'next/link'
import { CalendarClock, Plus, Users, CheckCircle2 } from 'lucide-react'
import type { ClinicConfig } from '@/lib/clinics'

interface StaffHeroProps {
  clinic: string
  profile: {
    full_name: string | null
    role: 'vet' | 'admin'
  }
  config: ClinicConfig
  todayStats: {
    appointmentsToday: number
    pendingCheckIn: number
    completedToday: number
  }
}

interface StatBadgeProps {
  value: number
  label: string
  icon: React.ReactNode
}

function StatBadge({ value, label, icon }: StatBadgeProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center rounded-xl bg-white/10 p-3 backdrop-blur-sm">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-white/70">{icon}</span>
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      <span className="text-xs font-medium text-white/70">{label}</span>
    </div>
  )
}

export function StaffHero({ clinic, profile, config, todayStats }: StaffHeroProps): React.ReactElement {
  // Time-based greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] py-10 text-white md:py-14">
      {/* Decorative elements */}
      <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-black/10 blur-3xl" />

      {/* Subtle pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Greeting */}
          <div>
            <h1 className="text-2xl font-bold md:text-3xl lg:text-4xl">
              {greeting}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-white/80">
              <CalendarClock className="h-4 w-4" />
              {new Date().toLocaleDateString('es-PY', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-3">
            <StatBadge
              value={todayStats.appointmentsToday}
              label="Citas hoy"
              icon={<CalendarClock className="h-4 w-4" />}
            />
            <StatBadge
              value={todayStats.pendingCheckIn}
              label="En espera"
              icon={<Users className="h-4 w-4" />}
            />
            <StatBadge
              value={todayStats.completedToday}
              label="Completadas"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/${clinic}/dashboard`}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[var(--primary)] shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
          >
            Ir al Dashboard
          </Link>
          <Link
            href={`/${clinic}/dashboard/appointments?action=new`}
            className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/20"
          >
            <Plus className="h-4 w-4" />
            Nueva Cita
          </Link>
          <Link
            href={`/${clinic}/dashboard/clients?action=new-client`}
            className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/20"
          >
            <Users className="h-4 w-4" />
            Nuevo Cliente
          </Link>
        </div>
      </div>
    </section>
  )
}
