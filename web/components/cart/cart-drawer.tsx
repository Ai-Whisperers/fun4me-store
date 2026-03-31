'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  X,
  ShoppingBag,
  ShoppingCart,
  ArrowRight,
  Stethoscope,
  Package,
  PawPrint,
  User,
  Trash2,
} from 'lucide-react'
import { useCart } from '@/context/cart-context'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CartItem } from './cart-item'
import { ServiceGroup } from './service-group'
import { formatPriceGs } from '@/lib/utils/pet-size'
import { organizeCart } from '@/lib/utils/cart-utils'

interface CartDrawerProps {
  /** Controlled open state */
  isOpen: boolean
  /** Callback when drawer should close */
  onClose: () => void
}

/**
 * Cart Drawer Component
 *
 * Slide-out sidebar displaying cart contents with quick actions.
 */
export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { clinic } = useParams<{ clinic: string }>()
  const { items, itemCount: totalItems, total: subtotal, clearCart } = useCart()
  const t = useTranslations('cart')
  const [mounted, setMounted] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Focus trap and keyboard handling
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || !drawerRef.current) return

      // Close on Escape
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Focus trap on Tab
      if (e.key === 'Tab') {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    },
    [isOpen, onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Focus management: focus first element on open, restore on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
      // Focus the close button after a short delay for animation
      setTimeout(() => {
        const closeButton = drawerRef.current?.querySelector<HTMLElement>('button[data-close-button="true"]')
        closeButton?.focus()
      }, 100)
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus()
      previousActiveElement.current = null
    }
  }, [isOpen])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Organize cart by owner products and pet services
  const organizedCart = useMemo(() => organizeCart(items), [items])

  if (!mounted) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t('ariaLabel')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-6 w-6 text-[var(--primary)]" />
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('title')}</h2>
            {totalItems > 0 && (
              <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-bold text-white">
                {totalItems}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            aria-label={t('closeCart')}
            data-close-button="true"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto">
          {items.length === 0 ? (
            /* Empty State */
            <div className="flex h-full flex-col items-center justify-center px-6 py-12">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--bg-subtle)]">
                <ShoppingBag className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-[var(--text-primary)]">
                {t('emptyTitle')}
              </h3>
              <p className="mb-6 text-center text-[var(--text-muted)]">
                {t('emptyMessage')}
              </p>
              <div className="flex w-full max-w-xs flex-col gap-3">
                <Link
                  href={`/${clinic}/services`}
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 font-bold text-white transition hover:brightness-110"
                >
                  <Stethoscope className="h-5 w-5" />
                  {t('viewServices')}
                </Link>
                <Link
                  href={`/${clinic}/store`}
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-subtle)] px-4 py-3 font-bold text-[var(--text-primary)] transition hover:bg-gray-200"
                >
                  <Package className="h-5 w-5" />
                  {t('viewStore')}
                </Link>
              </div>
            </div>
          ) : (
            /* Cart Items - Organized by Services first, then Products */
            <div className="space-y-5 px-4 py-4">
              {/* Services by Service Type (displayed first) */}
              {organizedCart.serviceGroups.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <div className="bg-[var(--primary)]/10 flex h-7 w-7 items-center justify-center rounded-full">
                      <Stethoscope className="h-4 w-4 text-[var(--primary)]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">{t('services')}</h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        {organizedCart.serviceGroups.length === 1
                          ? t('serviceCount', { count: organizedCart.serviceGroups.length })
                          : t('serviceCountPlural', { count: organizedCart.serviceGroups.length })}
                      </p>
                    </div>
                    <span className="ml-auto text-sm font-bold text-[var(--primary)]">
                      {formatPriceGs(organizedCart.servicesSubtotal)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {organizedCart.serviceGroups.map((group) => (
                      <ServiceGroup
                        key={`${group.service_id}-${group.variant_name}`}
                        {...group}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Ungrouped Services (no pet assigned) */}
              {organizedCart.ungroupedServices.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <Stethoscope className="h-4 w-4 text-[var(--text-secondary)]" />
                    <h3 className="text-sm font-bold text-[var(--text-secondary)]">
                      {t('otherServices')}
                    </h3>
                  </div>
                  <div className="bg-[var(--bg-subtle)]/50 space-y-1 rounded-xl p-3">
                    {organizedCart.ungroupedServices.map((item) => (
                      <CartItem key={item.id} item={item} compact />
                    ))}
                  </div>
                </div>
              )}

              {/* Products by Pet */}
              {organizedCart.petProducts.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-subtle)]">
                      <Package className="h-4 w-4 text-[var(--text-secondary)]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        {t('productsByPet')}
                      </h3>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {organizedCart.petProducts.map((group) => (
                      <div key={group.pet_id} className="bg-[var(--bg-subtle)]/50 rounded-xl p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <PawPrint className="h-4 w-4 text-[var(--primary)]" />
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {group.pet_name}
                          </span>
                          <span className="ml-auto text-sm font-bold text-[var(--primary)]">
                            {formatPriceGs(group.subtotal)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {group.products.map((item) => (
                            <CartItem key={item.id} item={item} compact />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unassigned Products (displayed last) */}
              {organizedCart.unassignedProducts.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-subtle)]">
                      <User className="h-4 w-4 text-[var(--text-secondary)]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">{t('products')}</h3>
                      <p className="text-xs text-[var(--text-muted)]">{t('forYou')}</p>
                    </div>
                    <span className="ml-auto text-sm font-bold text-[var(--primary)]">
                      {formatPriceGs(organizedCart.productsSubtotal)}
                    </span>
                  </div>
                  <div className="bg-[var(--bg-subtle)]/50 space-y-1 rounded-xl p-3">
                    {organizedCart.unassignedProducts.map((item) => (
                      <CartItem key={item.id} item={item} compact />
                    ))}
                  </div>
                </div>
              )}

              {/* Clear Cart Button - UX-006: With confirmation dialog */}
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-[var(--status-error)] transition-colors hover:bg-[var(--status-error-bg)] hover:text-[var(--status-error-text)]"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('emptyCart')}
                  </button>
                }
                title={t('emptyCartConfirmTitle')}
                description={t('emptyCartConfirmMessage', { count: totalItems })}
                confirmLabel={t('emptyCartConfirm')}
                cancelLabel={t('cancel')}
                variant="danger"
                onConfirm={clearCart}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="bg-[var(--bg-subtle)]/30 border-t border-gray-100 px-6 py-4">
            {/* Subtotal */}
            <div className="mb-4 flex items-center justify-between">
              <span className="font-medium text-[var(--text-secondary)]">{t('subtotal')}</span>
              <span className="text-2xl font-black text-[var(--primary)]">
                {formatPriceGs(subtotal)}
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link
                href={`/${clinic}/cart/checkout`}
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3.5 font-bold text-white shadow-lg transition hover:brightness-110"
              >
                {t('goToPay')}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href={`/${clinic}/cart`}
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 font-bold text-[var(--text-primary)] transition hover:bg-gray-50"
              >
                {t('viewFullCart')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Floating Cart Button
 *
 * Shows cart icon with badge, opens drawer on click.
 */
interface FloatingCartButtonProps {
  onClick: () => void
}

export function FloatingCartButton({ onClick }: FloatingCartButtonProps) {
  const { itemCount: totalItems } = useCart()
  const t = useTranslations('cart')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg transition-all hover:scale-105 hover:brightness-110"
      aria-label={t('openCartWithItems', { count: totalItems })}
    >
      <ShoppingCart className="h-6 w-6" />
      {totalItems > 0 && (
        <span className="animate-in zoom-in absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white shadow-md duration-200">
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </button>
  )
}
