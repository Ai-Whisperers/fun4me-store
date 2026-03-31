'use client'

/**
 * Add Card Modal Component
 *
 * Stripe Elements integration for adding credit/debit cards.
 * Shows subscription summary and handles SetupIntent flow.
 */

import { useState, useEffect } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useTranslations, useLocale } from 'next-intl'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { getStripe, cardElementOptions } from '@/lib/billing/stripe-client'
import { CreditCard, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react'

interface AddCardModalProps {
  isOpen: boolean
  onClose: () => void
  clinic: string
  trialDaysRemaining: number | null
  tierName: string
  monthlyAmount: number
  firstInvoiceDate: string | null
  onSuccess: () => void
}

export function AddCardModal(props: AddCardModalProps): React.ReactElement {
  const t = useTranslations('billing.addCard')
  const stripePromise = getStripe()

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={t('title')}
      size="lg"
    >
      <Elements stripe={stripePromise}>
        <AddCardForm {...props} />
      </Elements>
    </Modal>
  )
}

/**
 * Inner form component that uses Stripe hooks
 */
function AddCardForm({
  onClose,
  clinic,
  trialDaysRemaining,
  tierName,
  monthlyAmount,
  firstInvoiceDate,
  onSuccess,
}: Omit<AddCardModalProps, 'isOpen'>): React.ReactElement {
  const t = useTranslations('billing.addCard')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const stripe = useStripe()
  const elements = useElements()

  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)

  const localeStr = locale === 'es' ? 'es-PY' : 'en-US'

  // Get SetupIntent client secret
  useEffect(() => {
    async function createSetupIntent(): Promise<void> {
      try {
        const response = await fetch('/api/billing/stripe/setup-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clinic }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error?.message || t('errors.initForm'))
        }

        const data = await response.json()
        setClientSecret(data.client_secret)
      } catch (e) {
        setError(e instanceof Error ? e.message : t('errors.unknownError'))
      } finally {
        setIsLoading(false)
      }
    }

    createSetupIntent()
  }, [clinic, t])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()

    if (!stripe || !elements || !clientSecret) {
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setError(t('errors.cardFormNotFound'))
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Confirm SetupIntent
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      })

      if (stripeError) {
        throw new Error(stripeError.message || t('errors.processCard'))
      }

      if (!setupIntent?.payment_method) {
        throw new Error(t('errors.saveCard'))
      }

      // Notify backend
      const response = await fetch('/api/billing/stripe/confirm-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic,
          setup_intent_id: setupIntent.id,
          payment_method_id: setupIntent.payment_method,
          set_as_default: true,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || t('errors.confirmSave'))
      }

      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.unknownError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Format currency
   */
  function formatCurrency(amount: number): string {
    return `₲${amount.toLocaleString(localeStr)}`
  }

  /**
   * Format date
   */
  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(localeStr, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Subscription Summary */}
      <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--primary)]" />
          <div className="text-sm">
            <p className="font-medium text-[var(--text-primary)]">
              {t('subscriptionSummary')}
            </p>
            <ul className="mt-2 space-y-1 text-[var(--text-secondary)]">
              <li>{t('plan')}: <span className="font-medium">{tierName}</span></li>
              <li>{t('monthlyAmount')}: <span className="font-medium">{formatCurrency(monthlyAmount)}</span> {t('plusCommissions')}</li>
              {trialDaysRemaining !== null && trialDaysRemaining > 0 && (
                <li>{t('trialRemaining')}: <span className="font-medium">{t('trialDays', { days: trialDaysRemaining })}</span></li>
              )}
              {firstInvoiceDate && (
                <li>{t('firstInvoiceDate')}: <span className="font-medium">{formatDate(firstInvoiceDate)}</span></li>
              )}
            </ul>

            <div className="mt-3 space-y-1 text-xs text-[var(--text-muted)]">
              <p className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                {t('noChargeToday')}
              </p>
              <p className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                {t('cancelAnytime')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card Element */}
      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
            {t('cardData')}
          </span>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-paper)] p-4 transition-shadow focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]">
            <CardElement
              options={{
                ...cardElementOptions,
                hidePostalCode: true,
              }}
              onChange={(e) => {
                setCardComplete(e.complete)
                if (e.error) {
                  setError(e.error.message)
                } else {
                  setError(null)
                }
              }}
            />
          </div>
        </label>

        {/* Security Note */}
        <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
          <CreditCard className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{t('securityNote')}</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Actions */}
      <ModalFooter className="mt-6">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-xl px-4 py-2 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]"
        >
          {tCommon('cancel')}
        </button>
        <button
          type="submit"
          disabled={!stripe || !cardComplete || isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2 font-bold text-white transition-colors hover:bg-[var(--primary-dark)] disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('saving')}
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              {t('saveCard')}
            </>
          )}
        </button>
      </ModalFooter>
    </form>
  )
}
