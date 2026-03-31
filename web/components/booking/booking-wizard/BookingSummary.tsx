'use client'

import React, { useMemo } from 'react'
import { ShoppingBag, Zap, Clock, Phone } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useBookingStore, formatPrice } from '@/lib/store/booking-store'

interface BookingSummaryProps {
  labels?: {
    summary?: string
    service?: string
    services?: string
    patient?: string
    schedule?: string
    notSelected?: string
    toDefine?: string
    estimatedTotal?: string
    duration?: string
  }
}

/**
 * Sidebar summary component showing current booking selections
 * Note: No date/time display - clinic will contact customer to schedule
 */
export function BookingSummary({ labels = {} }: BookingSummaryProps) {
  const { selection, pets, getSelectedServices, getTotalDuration, getTotalPrice } =
    useBookingStore()
  const t = useTranslations('booking.wizard.summary')

  const selectedServices = getSelectedServices()
  const totalDuration = getTotalDuration()
  const totalPrice = getTotalPrice()

  const currentPet = useMemo(
    () => pets.find((p) => p.id === selection.petId),
    [pets, selection.petId]
  )

  const hasServices = selectedServices.length > 0

  return (
    <aside className="animate-in slide-in-from-bottom-8 space-y-6 duration-700 lg:sticky lg:top-12">
      <div className="rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-2xl">
        <h4 className="mb-6 flex items-center gap-3 font-black text-gray-900">
          <ShoppingBag className="h-5 w-5 text-[var(--primary)]" /> {labels.summary || t('title')}
        </h4>

        <div className="space-y-6">
          {/* Services Summary */}
          <div
            className={`rounded-2xl border p-4 transition-all ${
              hasServices
                ? 'bg-[var(--primary)]/5 border-[var(--primary)]/20'
                : 'border-gray-100 bg-gray-50'
            }`}
          >
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
              {selectedServices.length > 1
                ? labels.services || t('services')
                : labels.service || t('service')}
            </p>
            {hasServices ? (
              <div className="space-y-2">
                {selectedServices.map((service) => (
                  <div key={service.id} className="flex items-center gap-3">
                    <div className="rounded-lg bg-white p-2">
                      <Zap className="h-4 w-4 text-[var(--primary)]" />
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-gray-700">{service.name}</span>
                      <span className="ml-2 text-xs text-gray-500">({service.duration} min)</span>
                    </div>
                  </div>
                ))}
                {selectedServices.length > 1 && (
                  <div className="mt-2 flex items-center gap-2 border-t border-gray-200 pt-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{t('totalDuration', { minutes: totalDuration })}</span>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm font-bold italic text-gray-400">
                {labels.notSelected || t('notSelected')}
              </span>
            )}
          </div>

          {/* Pet Summary */}
          <div
            className={`rounded-2xl border p-4 transition-all ${
              selection.petId
                ? 'border-gray-800 bg-gray-900 text-white'
                : 'border-gray-100 bg-gray-50'
            }`}
          >
            <p
              className={`mb-2 text-[10px] font-black uppercase tracking-widest ${
                selection.petId ? 'text-gray-500' : 'text-gray-400'
              }`}
            >
              {labels.patient || t('patient')}
            </p>
            {selection.petId ? (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-bold">
                  {currentPet?.name[0]}
                </div>
                <span className="font-bold">{currentPet?.name}</span>
              </div>
            ) : (
              <span className="text-sm font-bold italic text-gray-400">
                {labels.notSelected || t('notSelected')}
              </span>
            )}
          </div>

          {/* Schedule Summary - Clinic will contact to schedule */}
          <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4 transition-all">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
              {labels.schedule || t('schedule')}
            </p>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[var(--primary)]" />
              <span className="text-sm font-bold text-[var(--primary)]">
                {labels.toDefine || t('toSchedule')}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">{t('willContact')}</p>
          </div>
        </div>

        {/* Total Price */}
        <div className="mt-8 border-t border-gray-100 pt-6">
          <div className="flex items-end justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">
              {labels.estimatedTotal || t('estimatedTotal')}
            </span>
            <span className="text-2xl font-black text-gray-900">₲{formatPrice(totalPrice)}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
