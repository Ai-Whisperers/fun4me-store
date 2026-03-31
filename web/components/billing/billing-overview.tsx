'use client'

/**
 * Billing Overview Component
 *
 * Displays the clinic's current subscription plan, trial status,
 * and estimated next invoice.
 */

import { Gift, Calendar, CreditCard, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import type { BillingOverviewResponse } from '@/lib/billing/types'

interface BillingOverviewProps {
  data: BillingOverviewResponse
  onAddPaymentMethod?: () => void
}

/**
 * Format currency in Paraguayan Guaranies
 */
function formatCurrency(amount: number): string {
  return `₲${amount.toLocaleString('es-PY')}`
}

/**
 * Format date to Spanish locale
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-PY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function BillingOverview({ data, onAddPaymentMethod }: BillingOverviewProps): React.ReactElement {
  const isPaidTier = data.tier !== 'gratis'
  const showTrialBanner = data.is_trial && data.trial_days_remaining !== null

  return (
    <div className="space-y-6">
      {/* Plan Card */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-paper)] shadow-sm">
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
            <CreditCard className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Plan Actual</h2>
            <p className="text-sm text-[var(--text-muted)]">Tu suscripcion</p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[var(--text-primary)]">
              {data.tier_display_name}
            </span>
            {isPaidTier && (
              <span className="text-lg text-[var(--text-muted)]">
                {formatCurrency(data.monthly_amount)}/mes
              </span>
            )}
          </div>

          {/* Trial Banner */}
          {showTrialBanner && (
            <div className="mt-4 flex items-start gap-3 rounded-lg bg-[var(--primary)]/5 p-4">
              <Gift className="h-5 w-5 flex-shrink-0 text-[var(--primary)]" />
              <div>
                <p className="font-medium text-[var(--primary)]">
                  Periodo de Prueba: {data.trial_days_remaining} dias restantes
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {data.first_invoice_date
                    ? `Primera factura: ${formatDate(data.first_invoice_date)}`
                    : `Prueba termina: ${formatDate(data.trial_end_date)}`}
                </p>
              </div>
            </div>
          )}

          {/* Payment Status */}
          {data.payment_status === 'overdue' && (
            <div className="mt-4 flex items-start gap-3 rounded-lg bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <p className="font-medium text-red-800">
                  Pago vencido ({data.days_overdue} dias)
                </p>
                <p className="mt-1 text-sm text-red-700">
                  Saldo pendiente: {formatCurrency(data.outstanding_balance)}
                </p>
              </div>
            </div>
          )}

          {data.payment_status === 'grace_period' && (
            <div className="mt-4 flex items-start gap-3 rounded-lg bg-orange-50 p-4">
              <Calendar className="h-5 w-5 flex-shrink-0 text-orange-500" />
              <div>
                <p className="font-medium text-orange-800">En periodo de gracia</p>
                <p className="mt-1 text-sm text-orange-700">
                  Saldo pendiente: {formatCurrency(data.outstanding_balance)}
                </p>
              </div>
            </div>
          )}

          {data.payment_status === 'current' && isPaidTier && !data.is_trial && (
            <div className="mt-4 flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Al dia</span>
            </div>
          )}

          {/* Payment Method Status */}
          {!data.has_payment_method && isPaidTier && (
            <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                No tienes un metodo de pago configurado.{' '}
                {onAddPaymentMethod && (
                  <button
                    onClick={onAddPaymentMethod}
                    className="font-medium text-yellow-900 underline hover:no-underline"
                  >
                    Agregar tarjeta
                  </button>
                )}
              </p>
            </div>
          )}

          {/* Default Payment Method */}
          {data.default_payment_method && (
            <div className="mt-4 flex items-center gap-2 text-[var(--text-secondary)]">
              <CreditCard className="h-4 w-4" />
              <span className="text-sm">{data.default_payment_method.display_name}</span>
              <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                Principal
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Estimated Invoice Card */}
      {isPaidTier && (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-paper)] shadow-sm">
          <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
              <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Proxima Factura Estimada</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Periodo: {formatDate(data.current_period.start)} - {formatDate(data.current_period.end)}
              </p>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-3">
              {/* Subscription Line */}
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">
                  Suscripcion {data.tier_display_name}
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {formatCurrency(data.current_period.subscription)}
                </span>
              </div>

              {/* Store Commissions */}
              {data.current_period.store_commission > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">
                    Comision tienda ({data.current_period.store_orders} ordenes)
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatCurrency(data.current_period.store_commission)}
                  </span>
                </div>
              )}

              {/* Service Commissions */}
              {data.current_period.service_commission > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">
                    Comision servicios ({data.current_period.service_appointments} citas)
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatCurrency(data.current_period.service_commission)}
                  </span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-[var(--border)] pt-3">
                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Subtotal</span>
                  <span className="text-[var(--text-primary)]">
                    {formatCurrency(data.current_period.estimated_subtotal)}
                  </span>
                </div>

                {/* Tax */}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">IVA (10%)</span>
                  <span className="text-[var(--text-primary)]">
                    {formatCurrency(data.current_period.estimated_tax)}
                  </span>
                </div>

                {/* Total */}
                <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
                  <span className="text-lg font-semibold text-[var(--text-primary)]">
                    Total Estimado
                  </span>
                  <span className="text-xl font-bold text-[var(--primary)]">
                    {formatCurrency(data.current_period.estimated_total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Next Invoice Date */}
            {data.next_invoice_date && (
              <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
                Se generara automaticamente el {formatDate(data.next_invoice_date)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Free Tier Message */}
      {!isPaidTier && (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-paper)] shadow-sm">
          <div className="p-6 text-center">
            <Gift className="mx-auto h-12 w-12 text-[var(--primary)]" />
            <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
              Plan Gratis Activo
            </h3>
            <p className="mt-2 text-[var(--text-secondary)]">
              Estas usando el plan gratuito. No se generaran facturas.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
