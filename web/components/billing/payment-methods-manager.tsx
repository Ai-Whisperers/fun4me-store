'use client'

/**
 * Payment Methods Manager Component
 *
 * Manages the list of payment methods with add/edit/delete capabilities.
 */

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/Toast'
import { CreditCard, Plus, Building2, AlertCircle } from 'lucide-react'
import { PaymentMethodCard, PaymentMethodCardSkeleton } from './payment-method-card'
import type { TenantPaymentMethod } from '@/lib/billing/types'

interface PaymentMethodsManagerProps {
  clinic: string
  hasPaymentMethod: boolean
  defaultPaymentMethod: TenantPaymentMethod | null
  onAddCard: () => void
  onShowBankDetails: () => void
  onRefresh: () => void
}

export function PaymentMethodsManager({
  clinic,
  hasPaymentMethod,
  defaultPaymentMethod,
  onAddCard,
  onShowBankDetails,
  onRefresh,
}: PaymentMethodsManagerProps): React.ReactElement {
  const t = useTranslations('billing.paymentMethods')
  const { showToast } = useToast()
  const [methods, setMethods] = useState<TenantPaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadPaymentMethods()
  }, [clinic])

  async function loadPaymentMethods(): Promise<void> {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/billing/payment-methods?clinic=${clinic}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || t('errors.loadMethods'))
      }

      const data = await response.json()
      setMethods(data.methods || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.unknown'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSetDefault(methodId: string): Promise<void> {
    try {
      const response = await fetch(`/api/billing/payment-methods/${methodId}/default`, {
        method: 'PUT',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || t('errors.setDefault'))
      }

      await loadPaymentMethods()
      onRefresh()
    } catch (e) {
      // BUG-009: Replace alert with toast notification
      showToast({
        title: e instanceof Error ? e.message : t('errors.unknown'),
        variant: 'error',
      })
    }
  }

  async function handleDelete(methodId: string): Promise<void> {
    if (!confirm(t('confirmDelete'))) return

    try {
      setDeletingId(methodId)

      const response = await fetch(`/api/billing/payment-methods/${methodId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || t('errors.deleteFailed'))
      }

      await loadPaymentMethods()
      onRefresh()
    } catch (e) {
      // BUG-009: Replace alert with toast notification
      showToast({
        title: e instanceof Error ? e.message : t('errors.unknown'),
        variant: 'error',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cards Section */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-paper)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
              <CreditCard className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">{t('cards')}</h2>
              <p className="text-sm text-[var(--text-muted)]">{t('cardsDescription')}</p>
            </div>
          </div>

          <button
            onClick={onAddCard}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-dark)]"
          >
            <Plus className="h-4 w-4" />
            {t('addCard')}
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              <PaymentMethodCardSkeleton />
              <PaymentMethodCardSkeleton />
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          ) : methods.filter((m) => m.method_type === 'card').length === 0 ? (
            <div className="py-8 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
              <p className="mt-4 text-[var(--text-secondary)]">
                {t('noCardsRegistered')}
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {t('addCardHint')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {methods
                .filter((m) => m.method_type === 'card')
                .map((method) => (
                  <PaymentMethodCard
                    key={method.id}
                    method={method}
                    onSetDefault={handleSetDefault}
                    onDelete={handleDelete}
                    isDeleting={deletingId === method.id}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Bank Transfer Section */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-paper)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
              <Building2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">{t('bankTransfer')}</h2>
              <p className="text-sm text-[var(--text-muted)]">{t('bankTransferDescription')}</p>
            </div>
          </div>

          <button
            onClick={onShowBankDetails}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            {t('viewInstructions')}
          </button>
        </div>

        <div className="p-6">
          <div className="rounded-lg bg-[var(--bg-subtle)] p-4">
            <p className="text-sm text-[var(--text-secondary)]">
              {t('bankTransferInfo')}
            </p>
          </div>
        </div>
      </div>

      {/* Auto-pay Info */}
      {hasPaymentMethod && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-green-100 p-1">
              <CreditCard className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">{t('autoPayEnabled')}</p>
              <p className="mt-1 text-sm text-green-700">
                {t('autoPayInfo')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
