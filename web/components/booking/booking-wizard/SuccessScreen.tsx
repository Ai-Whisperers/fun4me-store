'use client'

import React from 'react'
import { Check, Phone, Clock, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useBookingStore } from '@/lib/store/booking-store'

interface SuccessScreenProps {
  clinicId: string
  clinicName?: string
}

/**
 * Success screen component shown after successful booking request
 * Note: No PDF download - clinic will send confirmation with PDF after scheduling
 */
export function SuccessScreen({ clinicId, clinicName }: SuccessScreenProps) {
  const router = useRouter()
  const { selection, pets, getSelectedServices, getTotalDuration, getTotalPrice } = useBookingStore()
  const t = useTranslations('booking.wizard.success')

  const selectedServices = getSelectedServices()
  const currentPet = pets.find((p) => p.id === selection.petId)
  const totalDuration = getTotalDuration()

  // Format preference display
  const getPreferenceText = () => {
    const parts: string[] = []

    if (selection.preferredDateStart || selection.preferredDateEnd) {
      if (selection.preferredDateStart && selection.preferredDateEnd) {
        parts.push(`${selection.preferredDateStart} - ${selection.preferredDateEnd}`)
      } else if (selection.preferredDateStart) {
        parts.push(t('fromDate', { date: selection.preferredDateStart }))
      }
    }

    if (selection.preferredTimeOfDay && selection.preferredTimeOfDay !== 'any') {
      parts.push(selection.preferredTimeOfDay === 'morning' ? t('morning') : t('afternoon'))
    }

    return parts.length > 0 ? parts.join(' • ') : null
  }

  const preferenceText = getPreferenceText()

  return (
    <div className="animate-in zoom-in-95 mx-auto mt-8 max-w-2xl rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-2xl duration-500 sm:mt-20 sm:rounded-[3rem] sm:p-12">
      {/* Success Icon */}
      <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)] sm:mb-8 sm:h-24 sm:w-24">
        <Check className="relative z-10 h-10 w-10 sm:h-12 sm:w-12" />
        <div className="absolute inset-0 animate-ping rounded-full bg-[var(--status-success)] opacity-20"></div>
      </div>

      {/* Title */}
      <h2 className="mb-4 text-2xl font-black text-gray-900 sm:text-4xl">{t('title')}</h2>

      {/* Message */}
      <div className="mb-8 text-base leading-relaxed text-gray-500 sm:mb-10 sm:text-lg">
        <p>
          {t.rich('message', {
            petName: currentPet?.name ?? '',
          })}
        </p>

        {/* Contact notice */}
        <div className="mx-auto mt-6 flex max-w-md items-start gap-3 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4 text-left">
          <Phone className="h-5 w-5 flex-shrink-0 text-[var(--primary)]" />
          <div>
            <p className="font-bold text-[var(--primary)]">{t('contactTitle')}</p>
            <p className="text-sm text-gray-600">
              {t('contactDescription')}
            </p>
          </div>
        </div>

        {/* Preferences (if any) */}
        {preferenceText && (
          <div className="mx-auto mt-4 max-w-md rounded-2xl bg-gray-50 p-4 text-left">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
              <Calendar className="h-3 w-3" />
              {t('preferencesLabel')}
            </p>
            <p className="text-sm text-gray-700">{preferenceText}</p>
          </div>
        )}

        {/* Services list */}
        <div className="mx-auto mt-4 max-w-md rounded-2xl bg-gray-50 p-4 text-left">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
            <Clock className="h-3 w-3" />
            {t('servicesLabel', { count: selectedServices.length, duration: totalDuration })}
          </p>
          <ul className="space-y-1">
            {selectedServices.map((service, index) => (
              <li key={service.id} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
                  {index + 1}
                </span>
                {service.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <button
          onClick={() => router.push(`/${clinicId}/portal/dashboard`)}
          className="min-h-[48px] rounded-2xl bg-gray-900 px-8 py-4 font-bold text-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl sm:px-10 sm:py-5"
        >
          {t('backHome')}
        </button>
      </div>
    </div>
  )
}
