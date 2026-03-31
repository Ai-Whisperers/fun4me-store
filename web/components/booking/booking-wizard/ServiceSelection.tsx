'use client'

import React from 'react'
import { Layers, Check, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useBookingStore, formatPrice } from '@/lib/store/booking-store'
import { MAX_SERVICES_PER_BOOKING } from './types'

/**
 * Step 1: Multi-service selection component
 * Users can select multiple services (up to MAX_SERVICES_PER_BOOKING)
 */
export function ServiceSelection() {
  const { services, selection, toggleService, clearServices, setStep, getTotalDuration, getTotalPrice } =
    useBookingStore()
  const t = useTranslations('booking.wizard.serviceSelection')

  const selectedCount = selection.serviceIds.length
  const isAtLimit = selectedCount >= MAX_SERVICES_PER_BOOKING
  const totalDuration = getTotalDuration()
  const totalPrice = getTotalPrice()

  const handleContinue = () => {
    if (selectedCount > 0) {
      setStep('pet')
    }
  }

  return (
    <div className="animate-in slide-in-from-right-8 relative z-10 duration-500">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-[var(--primary)]/10 flex h-12 w-12 items-center justify-center rounded-2xl text-[var(--primary)]">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 sm:text-3xl">
              {t('title')}
            </h2>
            <p className="text-sm text-gray-500">
              {t('subtitle', { max: MAX_SERVICES_PER_BOOKING })}
            </p>
          </div>
        </div>

        {selectedCount > 0 && (
          <button
            onClick={clearServices}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            {t('clear')}
          </button>
        )}
      </div>

      {/* Selected count badge */}
      {selectedCount > 0 && (
        <div className={`mb-4 flex items-center justify-between rounded-2xl px-4 py-3 ${
          isAtLimit ? 'bg-amber-50' : 'bg-[var(--primary)]/5'
        }`}>
          <div className="flex flex-col">
            <span className={`font-medium ${isAtLimit ? 'text-amber-700' : 'text-[var(--primary)]'}`}>
              {t('selectedCount', { count: selectedCount })}
            </span>
            {isAtLimit && (
              <span className="text-xs text-amber-600">
                {t('limitReached')}
              </span>
            )}
          </div>
          <span className="text-sm text-gray-600">
            {totalDuration} min · ₲{formatPrice(totalPrice)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {services.length > 0 ? (
          services.map((s) => {
            const isSelected = selection.serviceIds.includes(s.id)
            const isDisabled = !isSelected && isAtLimit

            return (
              <button
                key={s.id}
                onClick={() => !isDisabled && toggleService(s.id)}
                disabled={isDisabled}
                aria-label={t('serviceAriaLabel', {
                  name: s.name,
                  duration: s.duration,
                  price: formatPrice(s.price),
                  selected: isSelected ? t('selectedSuffix') : '',
                  disabled: isDisabled ? t('disabledSuffix') : ''
                })}
                aria-pressed={isSelected}
                className={`group relative flex items-start gap-4 rounded-[2rem] border-2 p-6 text-left transition-all ${
                  isSelected
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-lg'
                    : isDisabled
                      ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-50'
                      : 'border-gray-100 bg-white hover:-translate-y-1 hover:border-[var(--primary)]/50 hover:shadow-xl'
                }`}
              >
                {/* Checkbox indicator */}
                <div
                  className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
                    isSelected
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="h-4 w-4" />}
                </div>

                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${s.color} transition-transform ${
                    isSelected ? 'scale-110' : 'group-hover:scale-110'
                  }`}
                >
                  <s.icon className="h-7 w-7" />
                </div>
                <div className="flex-1 pr-8">
                  <h3 className="mb-1 text-lg font-black text-gray-900">{s.name}</h3>
                  <p className="mb-2 text-sm font-medium text-gray-500 opacity-60">
                    {t('duration', { minutes: s.duration })}
                  </p>
                  <span className="font-black text-[var(--primary)]">
                    {t('priceFrom', { price: formatPrice(s.price) })}
                  </span>
                </div>
              </button>
            )
          })
        ) : (
          <div className="col-span-2 rounded-[2.5rem] border-2 border-dashed border-gray-200 bg-gray-50 py-20 text-center">
            <Layers className="mx-auto mb-6 h-16 w-16 text-gray-200" />
            <p className="mb-4 text-lg font-bold text-gray-500">
              {t('emptyTitle')}
            </p>
            <p className="text-sm text-gray-400">
              {t('emptyDescription')}
            </p>
          </div>
        )}
      </div>

      {/* Continue button */}
      {services.length > 0 && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleContinue}
            disabled={selectedCount === 0}
            className={`inline-flex items-center gap-2 rounded-full px-8 py-4 text-lg font-bold transition-all ${
              selectedCount > 0
                ? 'bg-[var(--primary)] text-white shadow-lg hover:shadow-xl'
                : 'cursor-not-allowed bg-gray-200 text-gray-400'
            }`}
          >
            {t('continue')}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}
