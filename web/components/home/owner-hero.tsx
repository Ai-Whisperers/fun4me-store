'use client'

import Link from 'next/link'
import { PawPrint, Calendar, CalendarPlus, MessageSquare, ArrowRight } from 'lucide-react'
import type { ClinicConfig } from '@/lib/clinics'

interface OwnerHeroProps {
  clinic: string
  profile: {
    full_name: string | null
    role: 'owner'
  }
  config: ClinicConfig
}

interface QuickActionCardProps {
  icon: React.ReactNode
  label: string
  href: string
  primary?: boolean
}

function QuickActionCard({ icon, label, href, primary }: QuickActionCardProps): React.ReactElement {
  return (
    <Link
      href={href}
      className={`group flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-all duration-300 hover:-translate-y-1 ${
        primary
          ? 'bg-[var(--accent)] text-[var(--secondary-contrast)] shadow-lg hover:shadow-xl'
          : 'bg-white/80 text-[var(--text-primary)] shadow-md hover:bg-white hover:shadow-lg'
      }`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${
          primary ? 'bg-white/20' : 'bg-[var(--primary)]/10'
        }`}
      >
        <span className={primary ? 'text-white' : 'text-[var(--primary)]'}>{icon}</span>
      </div>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  )
}

export function OwnerHero({ clinic, profile: _profile, config }: OwnerHeroProps): React.ReactElement {
  // Time-based greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--bg-subtle)] to-white py-10 md:py-14">
      {/* Decorative elements */}
      <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-[var(--primary)]/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-[var(--accent)]/10 blur-3xl" />

      {/* Paw print pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='1'%3E%3Cpath d='M11 14c-.5 2.5-2 4.5-4 6-2-1.5-3.5-3.5-4-6 1-1 2.5-1 3.5 0 .5.5.5 1.5.5 2.5.5-1 1-2 2-2.5 1 0 2 1 2 2.5 0-1 0-2 .5-2.5 1-1 2.5-1 3.5 0'/%3E%3Ccircle cx='7' cy='7' r='2'/%3E%3Ccircle cx='13' cy='5' r='2'/%3E%3Ccircle cx='17' cy='9' r='2'/%3E%3Ccircle cx='5' cy='12' r='2'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl lg:text-4xl">
            {greeting}
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Bienvenido a <span className="font-semibold text-[var(--primary)]">{config.name}</span>
          </p>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
          <QuickActionCard
            icon={<PawPrint className="h-6 w-6" />}
            label="Mis Mascotas"
            href={`/${clinic}/portal/pets`}
          />
          <QuickActionCard
            icon={<Calendar className="h-6 w-6" />}
            label="Mis Citas"
            href={`/${clinic}/portal/appointments`}
          />
          <QuickActionCard
            icon={<CalendarPlus className="h-6 w-6" />}
            label="Nueva Cita"
            href={`/${clinic}/book`}
            primary
          />
          <QuickActionCard
            icon={<MessageSquare className="h-6 w-6" />}
            label="Mensajes"
            href={`/${clinic}/portal/messages`}
          />
        </div>

        {/* Go to full portal link */}
        <div className="mt-6 text-center">
          <Link
            href={`/${clinic}/portal/dashboard`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] transition-colors hover:text-[var(--primary-dark)]"
          >
            Ir a Mi Portal
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
