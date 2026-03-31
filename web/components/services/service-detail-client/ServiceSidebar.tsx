/**
 * Service Sidebar Component
 *
 * Sidebar with pet selector and booking options.
 */

'use client'

import Link from 'next/link'
import * as Icons from 'lucide-react'
import { useTranslations } from 'next-intl'
import { MultiPetSelector } from '../multi-pet-selector'
import type { Service, ServiceDetailConfig, PetForService } from './types'

interface ServiceSidebarProps {
  service: Service
  config: ServiceDetailConfig
  clinic: string
  isLoggedIn: boolean
  selectedPetIds: string[]
  showPetPrompt: boolean
  hasSizeDependentVariants: boolean
  onPetSelectionChange: (pets: PetForService[]) => void
}

export function ServiceSidebar({
  service,
  config,
  clinic,
  isLoggedIn,
  selectedPetIds,
  showPetPrompt,
  hasSizeDependentVariants,
  onPetSelectionChange,
}: ServiceSidebarProps) {
  const t = useTranslations('services')

  return (
    <div className="space-y-6 lg:col-span-1">
      {/* Pet Selector Card */}
      {isLoggedIn && (
        <div
          id="pet-selector-card"
          className={`rounded-[var(--radius)] border bg-white p-6 shadow-[var(--shadow-sm)] transition-all ${
            showPetPrompt && selectedPetIds.length === 0
              ? 'border-amber-400 ring-2 ring-amber-200'
              : 'border-gray-100'
          }`}
        >
          <div className="mb-4 flex items-center gap-2">
            <Icons.PawPrint className="h-5 w-5 text-[var(--primary)]" />
            <h3 className="font-heading text-lg font-bold text-[var(--text-primary)]">
              {t('selectYourPets')}
            </h3>
          </div>
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            {hasSizeDependentVariants
              ? t('selectPetsHelperSizeDependent')
              : t('selectPetsHelper')}
          </p>
          <MultiPetSelector
            onSelectionChange={onPetSelectionChange}
            selectedPetIds={selectedPetIds}
          />
        </div>
      )}

      {/* Booking Card */}
      <div className="sticky top-6 rounded-[var(--radius)] border border-gray-100 bg-white p-6 shadow-[var(--shadow-md)]">
        <h3 className="font-heading mb-2 text-xl font-bold text-[var(--text-primary)]">
          {t('bookYourAppointment')}
        </h3>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          {t('bookOnlineDescription', { service: service.title })}
        </p>

        {service.booking?.online_enabled && (
          <Link
            href={`/${clinic}/book?service=${service.id}`}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-4 font-bold text-white shadow-lg transition-transform hover:-translate-y-1 hover:brightness-110"
          >
            <Icons.Calendar className="h-5 w-5" />
            {t('bookOnline')}
          </Link>
        )}

        {config.contact.whatsapp_number && (
          <a
            href={`https://wa.me/${config.contact.whatsapp_number}?text=${encodeURIComponent(
              t('whatsappTemplate', { service: service.title })
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`mb-4 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 font-bold transition-transform hover:-translate-y-1 ${
              service.booking?.online_enabled
                ? 'border-2 border-[#25D366] bg-white text-[#25D366] hover:bg-green-50'
                : 'bg-[#25D366] text-white shadow-lg hover:brightness-110'
            }`}
          >
            <Icons.MessageCircle className="h-5 w-5" />
            {t('contactWhatsApp')}
          </a>
        )}

        {/* Cart Link */}
        {isLoggedIn && (
          <Link
            href={`/${clinic}/cart`}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-[var(--bg-subtle)] px-6 py-3 font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-default)]"
          >
            <Icons.ShoppingCart className="h-5 w-5" />
            {t('viewCart')}
          </Link>
        )}
      </div>
    </div>
  )
}
