'use client'

import Link from 'next/link'
import * as Icons from 'lucide-react'
import { useTranslations } from 'next-intl'
import { QRGenerator } from '@/components/safety/qr-generator'

interface PetProfileHeaderProps {
  pet: {
    id: string
    name: string
    photo_url?: string
    species: string
    breed?: string
    sex?: string
    birth_date?: string | null
    is_neutered?: boolean
    color?: string
    weight_kg?: number | null
    microchip_number?: string | null
    profiles?: {
      full_name: string
      phone?: string
    }
  }
  clinic: string
  isStaff: boolean
}

export function PetProfileHeader({ pet, clinic, isStaff }: PetProfileHeaderProps) {
  const t = useTranslations('pets')

  // Calculate age with translations
  const calculateAge = (): string => {
    if (!pet.birth_date) return ''
    const birth = new Date(pet.birth_date)
    const today = new Date()
    let years = today.getFullYear() - birth.getFullYear()
    let months = today.getMonth() - birth.getMonth()
    if (months < 0) {
      years--
      months += 12
    }
    if (years > 0) {
      return months > 0
        ? t('ageDisplay.yearsMonths', { years, months })
        : t('ageDisplay.yearsOnly', { years })
    }
    return months > 0 ? t('ageDisplay.monthsOnly', { months }) : t('ageDisplay.lessThanMonth')
  }

  const age = calculateAge()

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="bg-[var(--primary)]/10 absolute left-0 top-0 z-0 h-32 w-full"></div>
      <div className="relative z-10 px-4 pb-6 pt-12 sm:px-8 sm:pb-8">
        {/* Top row: Avatar + Info + Desktop Actions */}
        <div className="flex flex-col items-start gap-4 sm:gap-6 md:flex-row md:items-end">
          {/* Avatar */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-white shadow-lg sm:h-32 sm:w-32">
            {pet.photo_url ? (
              <img
                src={pet.photo_url}
                alt={t('photoOf', { name: pet.name })}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <Icons.PawPrint
                className="h-12 w-12 text-gray-300 sm:h-16 sm:w-16"
                aria-hidden="true"
              />
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h1 className="mb-1 text-2xl font-black text-[var(--text-primary)] sm:text-4xl">
              {pet.name}
            </h1>
            <div className="mb-3 flex flex-wrap items-center gap-2 font-medium text-[var(--text-secondary)] sm:mb-4 sm:gap-3">
              <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs uppercase tracking-wider sm:px-3 sm:text-sm">
                {pet.species === 'dog' ? (
                  <Icons.Dog className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                  <Icons.Cat className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
                {pet.breed || t('mixed')}
              </span>
              {age && (
                <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs sm:px-3 sm:text-sm">
                  <Icons.Calendar className="h-3 w-3 sm:h-4 sm:w-4" /> {age}
                </span>
              )}
              <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs capitalize sm:px-3 sm:text-sm">
                {pet.sex === 'male' ? t('male') : pet.sex === 'female' ? t('female') : t('sexUnknown')}
                {pet.is_neutered && ` ${t('neuteredLabel')}`}
              </span>
              {pet.color && (
                <span className="hidden items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm sm:flex">
                  <Icons.Palette className="h-4 w-4" /> {pet.color}
                </span>
              )}
              {pet.weight_kg && (
                <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs sm:px-3 sm:text-sm">
                  <Icons.Weight className="h-3 w-3 sm:h-4 sm:w-4" /> {pet.weight_kg} kg
                </span>
              )}
              {pet.microchip_number && (
                <span className="hidden items-center gap-1 rounded-full border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-3 py-1 text-sm text-[var(--status-info-text)] sm:flex">
                  <Icons.QrCode className="h-4 w-4" /> {pet.microchip_number}
                </span>
              )}
            </div>

            {/* Owner Info (Staff Only) */}
            {isStaff && pet.profiles && (
              <div className="flex inline-flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Icons.User className="h-4 w-4" />{' '}
                  <span className="font-bold">{pet.profiles.full_name}</span>
                </div>
                <div className="h-4 w-px bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <Icons.Phone className="h-4 w-4" />{' '}
                  <span>{pet.profiles.phone || t('noPhone')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Actions */}
          <div className="hidden flex-wrap gap-2 md:flex">
            <Link
              href={`/${clinic}/book?pet=${pet.id}`}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 font-bold text-white shadow-md transition-all hover:opacity-90 hover:shadow-lg"
            >
              <Icons.CalendarPlus className="h-4 w-4" /> {t('bookAppointment')}
            </Link>
            <Link
              href={`/${clinic}/portal/pets/${pet.id}/edit`}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 font-bold text-gray-600 shadow-sm hover:bg-gray-50"
            >
              <Icons.Edit2 className="h-4 w-4" /> {t('edit')}
            </Link>
            <QRGenerator petId={pet.id} petName={pet.name} />
          </div>
        </div>

        {/* Mobile Actions */}
        <div className="scrollbar-hide mt-4 flex gap-2 overflow-x-auto pb-2 md:hidden">
          <Link
            href={`/${clinic}/book?pet=${pet.id}`}
            className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-4 py-2.5 font-bold text-white shadow-md"
          >
            <Icons.CalendarPlus className="h-4 w-4" /> {t('book')}
          </Link>
          <Link
            href={`/${clinic}/portal/pets/${pet.id}/edit`}
            className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-bold text-gray-600 shadow-sm"
          >
            <Icons.Edit2 className="h-4 w-4" /> {t('edit')}
          </Link>
          <QRGenerator petId={pet.id} petName={pet.name} />
        </div>
      </div>
    </div>
  )
}
