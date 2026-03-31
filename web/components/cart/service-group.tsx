'use client'

import { Minus, Plus, Trash2, PawPrint, Calendar } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCart } from '@/context/cart-context'
import { DynamicIcon } from '@/lib/icons'
import { useToast } from '@/components/ui/Toast'
import {
  formatPriceGs,
  SIZE_SHORT_LABELS,
  getSizeBadgeColor,
  type PetSizeCategory,
} from '@/lib/utils/pet-size'
import type { ServiceCartGroup, ServiceCartPet } from '@/lib/utils/cart-utils'

interface ServiceGroupProps extends ServiceCartGroup {
  /** Compact mode for drawer/sidebar display */
  compact?: boolean
}

/**
 * Service Group Component
 *
 * Displays a service variant with all pets that have it in cart.
 * Groups items by service+variant for a service-centric view.
 */
export function ServiceGroup({
  service_id,
  service_name,
  service_icon,
  variant_name,
  image_url,
  pets,
  subtotal,
  compact = false,
}: ServiceGroupProps) {
  const { updateQuantity, removeItem } = useCart()
  const { showToast } = useToast()
  const { clinic } = useParams() as { clinic: string }
  const t = useTranslations('cart')

  const handleIncrement = (pet: ServiceCartPet) => {
    const result = updateQuantity(pet.cart_item_id, 1)
    if (result.limitedByStock) {
      showToast(result.message || t('stockLimited', { count: result.availableStock ?? 0 }))
    }
  }

  const handleDecrement = (pet: ServiceCartPet) => {
    if (pet.quantity > 1) {
      updateQuantity(pet.cart_item_id, -1)
    } else {
      removeItem(pet.cart_item_id)
    }
  }

  const handleRemovePet = (pet: ServiceCartPet) => {
    removeItem(pet.cart_item_id)
  }

  const handleRemoveAll = () => {
    for (const pet of pets) {
      removeItem(pet.cart_item_id)
    }
  }

  if (compact) {
    return (
      <div className="border-b border-gray-100 py-3 last:border-0">
        {/* Service Header */}
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-subtle)]">
            {image_url ? (
              <Image
                src={image_url}
                alt={service_name}
                width={40}
                height={40}
                className="rounded-lg object-cover"
              />
            ) : (
              <DynamicIcon name={service_icon} className="h-5 w-5 text-[var(--primary)]" />
            )}
          </div>
          <div className="min-w-0 flex-grow">
            <p className="truncate text-sm font-bold text-[var(--text-primary)]">{service_name}</p>
            {variant_name && variant_name !== 'default' && (
              <p className="text-xs text-[var(--text-muted)]">{variant_name}</p>
            )}
          </div>
          <span className="text-sm font-bold text-[var(--primary)]">{formatPriceGs(subtotal)}</span>
        </div>

        {/* Pet List - Compact */}
        <div className="pl-13 space-y-1.5">
          {pets.map((pet) => (
            <div key={pet.cart_item_id} className="flex items-center gap-2 text-xs">
              <PawPrint className="h-3 w-3 text-[var(--primary)]" />
              <span className="text-[var(--text-secondary)]">{pet.pet_name}</span>
              <span
                className={`rounded px-1 py-0.5 text-[10px] font-bold ${getSizeBadgeColor(
                  pet.pet_size as PetSizeCategory
                )}`}
              >
                {SIZE_SHORT_LABELS[pet.pet_size as PetSizeCategory]}
              </span>
              <span className="ml-auto text-[var(--text-muted)]">{formatPriceGs(pet.price)}</span>
              <button
                type="button"
                onClick={() => handleRemovePet(pet)}
                className="p-1 text-gray-400 hover:text-red-500"
                aria-label={t('removePet', { name: pet.pet_name })}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Full size display
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      {/* Service Header */}
      <div className="flex items-center gap-4 border-b border-gray-100 bg-[var(--bg-subtle)] p-4">
        <div className="shrink-0">
          {image_url ? (
            <Image 
              src={image_url} 
              alt={service_name} 
              width={56}
              height={56}
              className="rounded-xl object-cover" 
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-sm">
              <DynamicIcon name={service_icon} className="h-7 w-7 text-[var(--primary)]" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-grow">
          <h4 className="text-lg font-bold text-[var(--text-primary)]">{service_name}</h4>
          {variant_name && variant_name !== 'default' && (
            <p className="text-sm text-[var(--text-muted)]">{variant_name}</p>
          )}
        </div>

        <div className="text-right">
          <p className="text-xl font-black text-[var(--primary)]">{formatPriceGs(subtotal)}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {pets.length === 1 ? t('petSingular', { count: pets.length }) : t('petPlural', { count: pets.length })}
          </p>
        </div>
      </div>

      {/* Pets List */}
      <div className="divide-y divide-gray-100">
        {pets.map((pet) => (
          <div
            key={pet.cart_item_id}
            className="flex items-center gap-4 p-4 transition-colors hover:bg-gray-50"
          >
            {/* Pet Info */}
            <div className="flex min-w-0 flex-grow items-center gap-2">
              <PawPrint className="h-4 w-4 shrink-0 text-[var(--primary)]" />
              <span className="font-medium text-[var(--text-primary)]">{pet.pet_name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${getSizeBadgeColor(
                  pet.pet_size as PetSizeCategory
                )}`}
              >
                {SIZE_SHORT_LABELS[pet.pet_size as PetSizeCategory]}
              </span>
            </div>

            {/* Price */}
            <span className="shrink-0 font-bold text-[var(--text-primary)]">
              {formatPriceGs(pet.price)}
            </span>

            {/* Quantity Controls */}
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => handleDecrement(pet)}
                className="hover:bg-[var(--primary)]/5 flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:border-[var(--primary)]"
                aria-label={t('decreaseQuantity')}
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 text-center text-sm font-bold">{pet.quantity}</span>
              <button
                type="button"
                onClick={() => handleIncrement(pet)}
                className="hover:bg-[var(--primary)]/5 flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:border-[var(--primary)]"
                aria-label={t('increaseQuantity')}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* Remove Button */}
            <button
              type="button"
              onClick={() => handleRemovePet(pet)}
              className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              aria-label={t('removePet', { name: pet.pet_name })}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 p-4">
        <Link
          href={`/${clinic}/book?service=${service_id}`}
          className="bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-[var(--primary)] transition-colors"
        >
          <Calendar className="h-4 w-4" />
          {t('scheduleAppointment')}
        </Link>

        {pets.length > 1 && (
          <button
            type="button"
            onClick={handleRemoveAll}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
            {t('removeAll')}
          </button>
        )}
      </div>
    </div>
  )
}
