'use client'

import React, { useMemo } from 'react'
import { ArrowLeft, ArrowRight, AlertCircle, Loader2, Phone } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useBookingStore, formatPrice, getLocalDateString } from '@/lib/store/booking-store'
import type { PreferredTimeOfDay } from './types'

/**
 * Step 3: Confirmation component - booking request flow
 * Note: No date/time selection - clinic will contact customer to schedule
 */
export function Confirmation() {
  const {
    selection,
    pets,
    isSubmitting,
    submitError,
    updateSelection,
    setStep,
    submitBooking,
    getSelectedServices,
    getTotalDuration,
    getTotalPrice,
  } = useBookingStore()
  const t = useTranslations('booking.wizard.confirmation')

  const selectedServices = getSelectedServices()
  const totalDuration = getTotalDuration()
  const totalPrice = getTotalPrice()

  const currentPet = useMemo(
    () => pets.find((p) => p.id === selection.petId),
    [pets, selection.petId]
  )

  // Calculate min date (tomorrow)
  const minDate = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return getLocalDateString(tomorrow)
  }, [])

  const handleSubmit = async () => {
    await submitBooking()
  }

  const handleTimeOfDayChange = (value: PreferredTimeOfDay) => {
    updateSelection({ preferredTimeOfDay: value })
  }

  return (
    <div className="animate-in slide-in-from-right-8 relative z-10 duration-500">
      <div className="mb-10 flex items-center gap-4">
        <button
          onClick={() => setStep('pet')}
          className="rounded-2xl bg-gray-50 p-3 text-gray-400 transition-all hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-3xl font-black text-gray-900">{t('title')}</h2>
      </div>

      {/* Info Banner */}
      <div className="mb-8 flex items-start gap-3 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
        <Phone className="h-5 w-5 flex-shrink-0 text-[var(--primary)]" />
        <div>
          <p className="font-bold text-[var(--primary)]">{t('contactBannerTitle')}</p>
          <p className="text-sm text-gray-600">
            {t('contactBannerDescription')}
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="mb-8 rounded-[3rem] border border-gray-100 bg-gray-50/50 p-10 backdrop-blur-sm">
        <div className="grid gap-10 md:grid-cols-2">
          {/* Left Column - Services */}
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                {t('servicesLabel', { count: selectedServices.length })}
              </p>
              <div className="space-y-3">
                {selectedServices.map((service, index) => (
                  <div key={service.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
                        {index + 1}
                      </span>
                      <p className="font-bold text-gray-900">{service.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{service.duration} min</p>
                      <p className="text-sm font-bold text-[var(--primary)]">
                        ₲{formatPrice(service.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedServices.length > 1 && (
                <div className="mt-4 border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-gray-700">{t('total')}</span>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{totalDuration} min</p>
                      <p className="text-lg text-[var(--primary)]">₲{formatPrice(totalPrice)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Patient */}
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                {t('patient')}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-xs font-bold text-white">
                  {currentPet?.name[0]}
                </div>
                <p className="text-xl font-black text-gray-900">{currentPet?.name}</p>
              </div>
            </div>
          </div>

          {/* Right Column - Preferences (optional) */}
          <div className="space-y-6">
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                {t('preferencesTitle')}
              </p>
              <p className="mb-4 text-sm text-gray-500">
                {t('preferencesDescription')}
              </p>

              {/* Preferred Date Range */}
              <div className="mb-4 space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('dateRangeLabel')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    min={minDate}
                    value={selection.preferredDateStart || ''}
                    onChange={(e) => updateSelection({ preferredDateStart: e.target.value || null })}
                    className="focus:ring-[var(--primary)]/20 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
                    placeholder="Desde"
                  />
                  <span className="text-gray-400">—</span>
                  <input
                    type="date"
                    min={selection.preferredDateStart || minDate}
                    value={selection.preferredDateEnd || ''}
                    onChange={(e) => updateSelection({ preferredDateEnd: e.target.value || null })}
                    className="focus:ring-[var(--primary)]/20 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
                    placeholder="Hasta"
                  />
                </div>
              </div>

              {/* Preferred Time of Day */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('timeLabel')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'morning' as const, label: t('timeOptions.morning.label'), desc: t('timeOptions.morning.desc') },
                    { value: 'afternoon' as const, label: t('timeOptions.afternoon.label'), desc: t('timeOptions.afternoon.desc') },
                    { value: 'any' as const, label: t('timeOptions.any.label'), desc: t('timeOptions.any.desc') },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleTimeOfDayChange(option.value)}
                      className={`flex-1 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                        selection.preferredTimeOfDay === option.value
                          ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <p className={`text-sm font-bold ${
                        selection.preferredTimeOfDay === option.value
                          ? 'text-[var(--primary)]'
                          : 'text-gray-700'
                      }`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-400">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="mb-10">
        <label className="mb-3 block text-xs font-black uppercase tracking-widest text-gray-400">
          {t('notesLabel')}
        </label>
        <textarea
          className="focus:ring-[var(--primary)]/10 h-32 w-full rounded-[2rem] border border-gray-100 bg-white p-6 font-medium text-gray-700 outline-none transition-all focus:ring-4"
          placeholder={t('notesPlaceholder')}
          value={selection.notes}
          onChange={(e) => updateSelection({ notes: e.target.value })}
        ></textarea>
      </div>

      {/* Error Display */}
      {submitError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 rounded-2xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4"
        >
          <div className="flex items-center gap-3 text-[var(--status-error-text)]">
            <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <p className="font-medium">{submitError}</p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="shadow-[var(--primary)]/40 flex items-center gap-4 rounded-[2rem] bg-[var(--primary)] px-12 py-6 text-xl font-black text-white shadow-2xl transition-all hover:scale-105 disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              {t('submit')} <ArrowRight className="h-6 w-6" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
