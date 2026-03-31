'use client'

import { Minus, Plus, Trash2, PawPrint, Package, AlertTriangle, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCart, type CartItem as CartItemType } from '@/context/cart-context'
import { DynamicIcon } from '@/lib/icons'
import { useToast } from '@/components/ui/Toast'
import {
  formatPriceGs,
  SIZE_SHORT_LABELS,
  getSizeBadgeColor,
  type PetSizeCategory,
} from '@/lib/utils/pet-size'

interface CartItemProps {
  item: CartItemType
  /** Compact mode for drawer/sidebar display */
  compact?: boolean
}

/**
 * Cart Item Component
 *
 * Displays a single cart item with appropriate details for products or services.
 * Shows pet info for services that were added with pet selection.
 */
export function CartItem({ item, compact = false }: CartItemProps) {
  const { updateQuantity, removeItem, getStockStatus } = useCart()
  const { showToast } = useToast()
  const { clinic } = useParams() as { clinic: string }
  const t = useTranslations('cart')

  const isService = item.type === 'service'
  const hasPetInfo = isService && item.pet_id && item.pet_name && item.pet_size
  const stockStatus = getStockStatus(item.id)

  const handleIncrement = () => {
    const result = updateQuantity(item.id, 1)
    if (result.limitedByStock) {
      showToast(result.message || t('stockLimited', { count: result.availableStock ?? 0 }))
    }
  }

  const handleDecrement = () => {
    if (item.quantity > 1) {
      updateQuantity(item.id, -1)
    } else {
      removeItem(item.id)
    }
  }

  const handleRemove = () => {
    removeItem(item.id)
  }

  if (compact) {
    return (
      <div className="flex gap-3 border-b border-gray-100 py-3 last:border-0">
        {/* Image or Icon */}
        <div className="shrink-0">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="h-14 w-14 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--bg-subtle)]">
              {isService ? (
                <DynamicIcon name={item.service_icon} className="h-6 w-6 text-[var(--primary)]" />
              ) : (
                <Package className="h-6 w-6 text-gray-400" />
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-grow">
          <p className="truncate text-sm font-bold text-[var(--text-primary)]">{item.name}</p>

          {/* Pet Badge for Services */}
          {hasPetInfo && (
            <div className="mt-1 flex items-center gap-1.5">
              <PawPrint className="h-3 w-3 text-[var(--primary)]" />
              <span className="text-xs text-[var(--text-secondary)]">{item.pet_name}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${getSizeBadgeColor(
                  item.pet_size as PetSizeCategory
                )}`}
              >
                {SIZE_SHORT_LABELS[item.pet_size as PetSizeCategory]}
              </span>
            </div>
          )}

          {/* Schedule Button for Services - Compact */}
          {isService && item.service_id && clinic && (
            <Link
              href={`/${clinic}/book?service=${item.service_id}${item.pet_id ? `&pet=${item.pet_id}` : ''}`}
              className="bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 mt-1.5 flex w-fit items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-[var(--primary)] transition-colors"
            >
              <Calendar className="h-3 w-3" />
              {t('schedule')}
            </Link>
          )}

          {/* Stock Warning Badge - Compact */}
          {stockStatus?.atLimit && (
            <div className="mt-1 flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-[10px] font-medium">{t('stockLimit')}</span>
            </div>
          )}
          {stockStatus?.nearLimit && !stockStatus.atLimit && (
            <div className="mt-1 flex items-center gap-1 text-amber-500">
              <span className="text-[10px]">{t('stockRemaining', { count: stockStatus.available })}</span>
            </div>
          )}

          {/* Price & Quantity */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--primary)]">
              {formatPriceGs(item.price * item.quantity)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDecrement}
                className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 transition-colors hover:bg-gray-200"
                aria-label={t('decreaseQuantity')}
              >
                <Minus className="h-3 w-3" />
              </button>
              <span
                className={`w-6 text-center text-sm font-bold ${stockStatus?.atLimit ? 'text-amber-600' : ''}`}
              >
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={stockStatus?.atLimit}
                className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={t('increaseQuantity')}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Remove Button */}
        <button
          type="button"
          onClick={handleRemove}
          className="shrink-0 self-start p-1.5 text-gray-400 transition-colors hover:text-red-500"
          aria-label={t('remove')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )
  }

  // Full size display (for checkout page, etc.)
  return (
    <div className="flex gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      {/* Image or Icon */}
      <div className="shrink-0">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="h-20 w-20 rounded-xl object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-[var(--bg-subtle)]">
            {isService ? (
              <DynamicIcon name={item.service_icon} className="h-8 w-8 text-[var(--primary)]" />
            ) : (
              <Package className="h-8 w-8 text-gray-400" />
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-grow">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-lg font-bold text-[var(--text-primary)]">{item.name}</h4>
            {item.description && (
              <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">
                {item.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            aria-label={t('remove')}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        {/* Pet Info for Services */}
        {hasPetInfo && (
          <div className="bg-[var(--primary)]/5 mt-3 flex items-center gap-2 rounded-lg p-2">
            <PawPrint className="h-4 w-4 text-[var(--primary)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              {t('forPet', { name: item.pet_name ?? '' })}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${getSizeBadgeColor(
                item.pet_size as PetSizeCategory
              )}`}
            >
              {SIZE_SHORT_LABELS[item.pet_size as PetSizeCategory]}
            </span>
            {item.base_price && item.base_price !== item.price && (
              <span className="ml-auto text-xs text-[var(--text-muted)]">
                Base: {formatPriceGs(item.base_price)}
              </span>
            )}
          </div>
        )}

        {/* Service variant name */}
        {isService && item.variant_name && !hasPetInfo && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{t('variant', { name: item.variant_name })}</p>
        )}

        {/* Schedule Button for Services */}
        {isService && item.service_id && clinic && (
          <Link
            href={`/${clinic}/book?service=${item.service_id}${item.pet_id ? `&pet=${item.pet_id}` : ''}`}
            className="bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 border-[var(--primary)]/20 mt-3 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold text-[var(--primary)] transition-colors"
          >
            <Calendar className="h-4 w-4" />
            {t('scheduleAppointment')}
          </Link>
        )}

        {/* Stock Warning - Full Size */}
        {stockStatus?.atLimit && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              {t('stockReached')}
            </span>
          </div>
        )}
        {stockStatus?.nearLimit && !stockStatus.atLimit && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/50 p-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-amber-600">
              {t('stockRemainingLong', { count: stockStatus.available })}
            </span>
          </div>
        )}

        {/* Price & Quantity Controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDecrement}
              className="hover:bg-[var(--primary)]/5 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:border-[var(--primary)]"
              aria-label={t('decreaseQuantity')}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span
              className={`w-10 text-center text-lg font-bold ${stockStatus?.atLimit ? 'text-amber-600' : ''}`}
            >
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={stockStatus?.atLimit}
              className="hover:bg-[var(--primary)]/5 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t('increaseQuantity')}
            >
              <Plus className="h-4 w-4" />
            </button>
            {item.stock !== undefined && (
              <span
                className={`ml-2 text-xs ${stockStatus?.atLimit ? 'font-medium text-amber-600' : 'text-[var(--text-muted)]'}`}
              >
                ({t('available', { count: item.stock })})
              </span>
            )}
          </div>

          <div className="text-right">
            {item.quantity > 1 && (
              <p className="text-xs text-[var(--text-muted)]">{t('each', { price: formatPriceGs(item.price) })}</p>
            )}
            <p className="text-xl font-black text-[var(--primary)]">
              {formatPriceGs(item.price * item.quantity)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
