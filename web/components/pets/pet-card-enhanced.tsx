'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  Dog,
  Cat,
  PawPrint,
  Calendar,
  AlertTriangle,
  Clock,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

interface Vaccine {
  id: string
  name: string
  next_due_date?: string | null
  status: string
}

interface Appointment {
  id: string
  start_time: string
  status: string
  services: Array<{ name: string }> | null
}

interface PetCardProps {
  pet: {
    id: string
    name: string
    species: string
    breed?: string | null
    birth_date?: string | null
    photo_url?: string | null
    weight_kg?: number | null
    allergies?: string[] | null
    chronic_conditions?: string[] | null
    vaccines?: Vaccine[]
    last_visit_date?: string | null
    next_appointment?: Appointment | null
  }
  clinic: string
}

export function PetCardEnhanced({ pet, clinic }: PetCardProps) {
  const t = useTranslations('pets.card')
  const locale = useLocale()
  const localeStr = locale === 'es' ? 'es-PY' : 'en-US'

  // Calculate age
  const calculateAge = (birthDate: string | null | undefined): string => {
    if (!birthDate) return t('unknownAge')

    const birth = new Date(birthDate)
    const today = new Date()

    let years = today.getFullYear() - birth.getFullYear()
    let months = today.getMonth() - birth.getMonth()

    if (months < 0) {
      years--
      months += 12
    }

    if (years > 0) {
      if (months > 0) {
        return `${years} ${years === 1 ? t('year') : t('years')}, ${months} ${months === 1 ? t('month') : t('months')}`
      }
      return `${years} ${years === 1 ? t('year') : t('years')}`
    } else if (months > 0) {
      return `${months} ${months === 1 ? t('month') : t('months')}`
    }
    return t('baby')
  }

  // Get vaccine status
  const getVaccineStatus = (): {
    status: 'ok' | 'warning' | 'danger'
    count: number
    message: string
  } => {
    if (!pet.vaccines || pet.vaccines.length === 0) {
      return { status: 'warning', count: 0, message: t('noVaccines') }
    }

    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

    let overdueCount = 0
    let upcomingCount = 0

    pet.vaccines.forEach((vaccine) => {
      if (vaccine.next_due_date) {
        const dueDate = new Date(vaccine.next_due_date)
        if (dueDate < today) {
          overdueCount++
        } else if (dueDate <= thirtyDaysFromNow) {
          upcomingCount++
        }
      }
    })

    if (overdueCount > 0) {
      return {
        status: 'danger',
        count: overdueCount,
        message: overdueCount > 1 ? t('overdueVaccines', { count: overdueCount }) : t('overdueVaccine', { count: overdueCount }),
      }
    }
    if (upcomingCount > 0) {
      return {
        status: 'warning',
        count: upcomingCount,
        message: upcomingCount > 1 ? t('upcomingVaccines', { count: upcomingCount }) : t('upcomingVaccine', { count: upcomingCount }),
      }
    }
    return { status: 'ok', count: 0, message: t('vaccinesUpToDate') }
  }

  // Format date
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString(localeStr, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Check for health alerts
  const hasHealthAlerts = (): boolean => {
    return (
      !!(pet.allergies && pet.allergies.length > 0) ||
      !!(pet.chronic_conditions && pet.chronic_conditions.length > 0)
    )
  }

  const vaccineStatus = getVaccineStatus()

  return (
    <Link
      href={`/${clinic}/portal/pets/${pet.id}`}
      className="hover:border-[var(--primary)]/20 group block rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:shadow-lg"
    >
      <div className="p-5">
        <div className="flex gap-4">
          {/* Photo */}
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 md:h-24 md:w-24">
            {pet.photo_url ? (
              <Image
                src={pet.photo_url}
                alt={pet.name}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                <PawPrint className="h-10 w-10" />
              </div>
            )}
            {/* Species badge */}
            <div className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow">
              {pet.species === 'dog' ? (
                <Dog className="h-3.5 w-3.5 text-amber-600" />
              ) : (
                <Cat className="h-3.5 w-3.5 text-purple-600" />
              )}
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            {/* Header row */}
            <div className="mb-1 flex items-start justify-between gap-2">
              <h3 className="truncate text-lg font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
                {pet.name}
              </h3>
              {/* Vaccine status badge */}
              <div
                className={`flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  vaccineStatus.status === 'danger'
                    ? 'bg-[var(--status-error-bg)] text-[var(--status-error-text)]'
                    : vaccineStatus.status === 'warning'
                      ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]'
                      : 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]'
                }`}
              >
                {vaccineStatus.status === 'danger' ? (
                  <AlertCircle className="h-3 w-3" />
                ) : vaccineStatus.status === 'warning' ? (
                  <Clock className="h-3 w-3" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">{vaccineStatus.message}</span>
                {vaccineStatus.status !== 'ok' && (
                  <span className="sm:hidden">{vaccineStatus.count}</span>
                )}
              </div>
            </div>

            {/* Breed and age */}
            <p className="mb-3 text-sm text-gray-500">
              <span className="font-medium">{pet.breed || t('mixedBreed')}</span>
              <span className="mx-1.5">•</span>
              <span>{calculateAge(pet.birth_date)}</span>
              {pet.weight_kg && (
                <>
                  <span className="mx-1.5">•</span>
                  <span>{pet.weight_kg} kg</span>
                </>
              )}
            </p>

            {/* Info rows */}
            <div className="space-y-1.5 text-xs">
              {/* Last visit */}
              {pet.last_visit_date && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  <span>{t('lastVisit')} {formatDate(pet.last_visit_date)}</span>
                </div>
              )}

              {/* Next appointment */}
              {pet.next_appointment && (
                <div className="flex items-center gap-2 text-[var(--primary)]">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">
                    {t('nextAppointment')} {formatDate(pet.next_appointment.start_time)}
                    {pet.next_appointment.services && pet.next_appointment.services.length > 0 && pet.next_appointment.services[0].name && (
                      <span className="font-normal text-gray-400">
                        {' '}
                        - {pet.next_appointment.services[0].name}
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Health alerts */}
              {hasHealthAlerts() && (
                <div className="flex items-center gap-2 text-[var(--status-warning)]">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>
                    {pet.allergies &&
                      pet.allergies.length > 0 &&
                      `${t('allergies')} ${pet.allergies.slice(0, 2).join(', ')}`}
                    {pet.allergies &&
                      pet.allergies.length > 0 &&
                      pet.chronic_conditions &&
                      pet.chronic_conditions.length > 0 &&
                      ' • '}
                    {pet.chronic_conditions &&
                      pet.chronic_conditions.length > 0 &&
                      t('chronicConditions')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex-shrink-0 self-center">
            <ChevronRight className="h-5 w-5 text-gray-300 transition-all group-hover:translate-x-1 group-hover:text-[var(--primary)]" />
          </div>
        </div>
      </div>
    </Link>
  )
}
