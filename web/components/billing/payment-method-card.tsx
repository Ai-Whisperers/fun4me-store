'use client'

/**
 * Payment Method Card Component
 *
 * Displays a single payment method (card, bank transfer, etc.)
 * with actions like set default and delete.
 */

import { CreditCard, Building2, Star, Trash2, MoreVertical, Check } from 'lucide-react'
import { useState } from 'react'
import type { TenantPaymentMethod } from '@/lib/billing/types'

interface PaymentMethodCardProps {
  method: TenantPaymentMethod
  onSetDefault?: (id: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  isDeleting?: boolean
}

/**
 * Get card brand icon/color
 */
function getCardBrandStyles(brand: string | null): { color: string; name: string } {
  switch (brand?.toLowerCase()) {
    case 'visa':
      return { color: 'text-blue-600', name: 'Visa' }
    case 'mastercard':
      return { color: 'text-orange-600', name: 'Mastercard' }
    case 'amex':
      return { color: 'text-blue-500', name: 'American Express' }
    default:
      return { color: 'text-gray-600', name: brand || 'Tarjeta' }
  }
}

export function PaymentMethodCard({
  method,
  onSetDefault,
  onDelete,
  isDeleting = false,
}: PaymentMethodCardProps): React.ReactElement {
  const [isSettingDefault, setIsSettingDefault] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const isCard = method.method_type === 'card'
  const isBankTransfer = method.method_type === 'bank_transfer'

  async function handleSetDefault(): Promise<void> {
    if (!onSetDefault || method.is_default) return
    try {
      setIsSettingDefault(true)
      await onSetDefault(method.id)
    } finally {
      setIsSettingDefault(false)
      setShowMenu(false)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!onDelete) return
    await onDelete(method.id)
    setShowMenu(false)
  }

  const cardStyles = isCard ? getCardBrandStyles(method.card_brand) : null

  return (
    <div className="relative rounded-xl border border-[var(--border)] bg-[var(--bg-paper)] p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-subtle)]">
          {isCard ? (
            <CreditCard className={`h-6 w-6 ${cardStyles?.color || 'text-gray-600'}`} />
          ) : (
            <Building2 className="h-6 w-6 text-gray-600" />
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--text-primary)]">
              {method.display_name}
            </span>
            {method.is_default && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                <Star className="h-3 w-3" />
                Principal
              </span>
            )}
          </div>

          {/* Card details */}
          {isCard && method.card_exp_month && method.card_exp_year && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Expira: {String(method.card_exp_month).padStart(2, '0')}/{method.card_exp_year}
            </p>
          )}

          {/* Bank transfer details */}
          {isBankTransfer && method.bank_name && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {method.bank_name}
              {method.bank_alias && ` - ${method.bank_alias}`}
            </p>
          )}

          {/* Verification status */}
          {method.is_verified && (
            <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" />
              Verificado
            </div>
          )}
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-secondary)]"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-[var(--border)] bg-[var(--bg-paper)] py-1 shadow-lg">
                {!method.is_default && onSetDefault && (
                  <button
                    onClick={handleSetDefault}
                    disabled={isSettingDefault}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-50"
                  >
                    <Star className="h-4 w-4" />
                    {isSettingDefault ? 'Configurando...' : 'Establecer como principal'}
                  </button>
                )}

                {onDelete && !method.is_default && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? 'Eliminando...' : 'Eliminar'}
                  </button>
                )}

                {method.is_default && (
                  <p className="px-4 py-2 text-xs text-[var(--text-muted)]">
                    No se puede eliminar el metodo principal
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton loading state for payment method card
 */
export function PaymentMethodCardSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 rounded bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  )
}
