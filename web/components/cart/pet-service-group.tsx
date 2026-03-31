'use client'

import { Dog, Cat, PawPrint, Minus, Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCart, type CartItem } from '@/context/cart-context'
import {
  formatPriceGs,
  SIZE_SHORT_LABELS,
  getSizeBadgeColor,
  SIZE_LABELS,
  type PetSizeCategory,
} from '@/lib/utils/pet-size'

interface PetServiceGroupProps {
  /** Pet ID */
  petId: string
  /** Pet name */
  petName: string
  /** Pet size category */
  petSize: PetSizeCategory
  /** Pet photo URL (optional) */
  petPhoto?: string
  /** Pet species for icon fallback */
  petSpecies?: 'dog' | 'cat' | string
  /** Services for this pet */
  services: CartItem[]
  /** Subtotal for this pet's services */
  subtotal: number
  /** Compact mode for drawer */
  compact?: boolean
}

/**
 * Pet Service Group Component
 *
 * Displays a pet card with all their associated services.
 * Used in cart drawer and checkout to organize services by pet.
 */
export function PetServiceGroup({
  petId,
  petName,
  petSize,
  petPhoto,
  petSpecies,
  services,
  subtotal,
  compact = false,
}: PetServiceGroupProps) {
  const { updateQuantity, removeItem } = useCart()
  const t = useTranslations('cart')

  const handleIncrement = (item: CartItem) => {
    updateQuantity(item.id, 1)
  }

  const handleDecrement = (item: CartItem) => {
    if (item.quantity > 1) {
      updateQuantity(item.id, -1)
    } else {
      removeItem(item.id)
    }
  }

  const PetIcon = petSpecies === 'dog' ? Dog : petSpecies === 'cat' ? Cat : PawPrint

  if (compact) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        {/* Pet Header */}
        <div className="from-[var(--primary)]/5 flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r to-transparent p-3">
          {petPhoto ? (
            <img
              src={petPhoto}
              alt={petName}
              className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[var(--bg-subtle)] shadow-sm">
              <PetIcon className="h-5 w-5 text-[var(--primary)]" />
            </div>
          )}
          <div className="min-w-0 flex-grow">
            <div className="flex items-center gap-2">
              <span className="truncate font-bold text-[var(--text-primary)]">{petName}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${getSizeBadgeColor(
                  petSize
                )}`}
              >
                {SIZE_SHORT_LABELS[petSize]}
              </span>
            </div>
            <span className="text-xs text-[var(--text-muted)]">
              {services.length === 1 ? t('serviceSingular', { count: services.length }) : t('servicePlural', { count: services.length })}
            </span>
          </div>
          <span className="text-sm font-black text-[var(--primary)]">
            {formatPriceGs(subtotal)}
          </span>
        </div>

        {/* Services List */}
        <div className="divide-y divide-gray-50">
          {services.map((service) => (
            <div key={service.id} className="flex items-center gap-2 p-2.5 pl-4">
              <div className="bg-[var(--primary)]/20 h-8 w-1 rounded-full" />
              <div className="min-w-0 flex-grow">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {service.name
                    .replace(`${petName} - `, '')
                    .replace(` - ${service.variant_name}`, '')}
                </p>
                {service.variant_name && (
                  <p className="text-xs text-[var(--text-muted)]">{service.variant_name}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleDecrement(service)}
                  className="flex h-5 w-5 items-center justify-center rounded bg-gray-100 transition-colors hover:bg-gray-200"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-5 text-center text-xs font-bold">{service.quantity}</span>
                <button
                  type="button"
                  onClick={() => handleIncrement(service)}
                  className="flex h-5 w-5 items-center justify-center rounded bg-gray-100 transition-colors hover:bg-gray-200"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <span className="w-20 text-right text-xs font-bold text-[var(--primary)]">
                {formatPriceGs(service.price * service.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Full size display (checkout page)
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Pet Header */}
      <div className="from-[var(--primary)]/10 via-[var(--primary)]/5 flex items-center gap-4 border-b border-gray-100 bg-gradient-to-r to-transparent p-5">
        {petPhoto ? (
          <img
            src={petPhoto}
            alt={petName}
            className="h-16 w-16 rounded-2xl border-2 border-white object-cover shadow-md"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white bg-white shadow-md">
            <PetIcon className="h-8 w-8 text-[var(--primary)]" />
          </div>
        )}
        <div className="flex-grow">
          <div className="mb-1 flex items-center gap-3">
            <h3 className="text-xl font-black text-[var(--text-primary)]">{petName}</h3>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${getSizeBadgeColor(petSize)}`}
            >
              {SIZE_SHORT_LABELS[petSize]}
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            {SIZE_LABELS[petSize]} • {services.length === 1 ? t('serviceSingular', { count: services.length }) : t('servicePlural', { count: services.length })}
          </p>
        </div>
        <div className="text-right">
          <p className="mb-1 text-xs text-[var(--text-muted)]">{t('subtotal')}</p>
          <p className="text-2xl font-black text-[var(--primary)]">{formatPriceGs(subtotal)}</p>
        </div>
      </div>

      {/* Services List */}
      <div className="divide-y divide-gray-100">
        {services.map((service) => (
          <div
            key={service.id}
            className="flex items-center gap-4 p-4 transition-colors hover:bg-gray-50"
          >
            {/* Service indicator */}
            <div className="bg-[var(--primary)]/30 h-12 w-1.5 rounded-full" />

            {/* Service image */}
            {service.image_url && (
              <img
                src={service.image_url}
                alt={service.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            )}

            {/* Service info */}
            <div className="min-w-0 flex-grow">
              <p className="font-bold text-[var(--text-primary)]">
                {
                  service.name
                    .replace(`${petName} - `, '')
                    .replace(` - ${service.variant_name}`, '')
                    .split(' - ')[0]
                }
              </p>
              {service.variant_name && (
                <p className="text-sm text-[var(--text-muted)]">{service.variant_name}</p>
              )}
              {service.base_price && service.base_price !== service.price && (
                <p className="mt-1 text-xs text-amber-600">
                  {t('adjustedBySize', { base: formatPriceGs(service.base_price) })}
                </p>
              )}
            </div>

            {/* Quantity controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDecrement(service)}
                className="hover:bg-[var(--primary)]/5 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:border-[var(--primary)]"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-bold">{service.quantity}</span>
              <button
                type="button"
                onClick={() => handleIncrement(service)}
                className="hover:bg-[var(--primary)]/5 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:border-[var(--primary)]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Price */}
            <div className="w-28 text-right">
              {service.quantity > 1 && (
                <p className="text-xs text-[var(--text-muted)]">
                  {t('each', { price: formatPriceGs(service.price) })}
                </p>
              )}
              <p className="text-lg font-black text-[var(--primary)]">
                {formatPriceGs(service.price * service.quantity)}
              </p>
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeItem(service.id)}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              aria-label={t('removeService')}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
