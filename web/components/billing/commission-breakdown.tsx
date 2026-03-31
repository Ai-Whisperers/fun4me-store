'use client'

/**
 * Commission Breakdown Component
 *
 * Displays detailed breakdown of store and service commissions
 * for the current billing period.
 */

import { useLocale, useTranslations } from 'next-intl'
import { ShoppingBag, Stethoscope, TrendingUp } from 'lucide-react'
import type { BillingOverviewResponse } from '@/lib/billing/types'

interface CommissionBreakdownProps {
  currentPeriod: BillingOverviewResponse['current_period']
  tier: string
}

/**
 * Get commission rate based on tier
 * Profesional tier has 3% commission on both store and services
 */
function getCommissionRate(tier: string): { store: string; service: string } {
  switch (tier) {
    case 'profesional':
      return { store: '3%', service: '3%' }
    default:
      return { store: '0%', service: '0%' }
  }
}

export function CommissionBreakdown({
  currentPeriod,
  tier,
}: CommissionBreakdownProps): React.ReactElement {
  const t = useTranslations('billing.commissions')
  const locale = useLocale()
  const rates = getCommissionRate(tier)
  const hasCommissions = currentPeriod.total_commission > 0

  // Format currency in Paraguayan Guaranies
  const formatCurrency = (amount: number): string => {
    return `₲${amount.toLocaleString(locale === 'es' ? 'es-PY' : 'en-US')}`
  }

  if (!hasCommissions) {
    return (
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-paper)] shadow-sm">
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
            <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">{t('title')}</h2>
            <p className="text-sm text-[var(--text-muted)]">{t('thisMonth')}</p>
          </div>
        </div>

        <div className="p-6 text-center">
          <p className="text-[var(--text-secondary)]">
            {t('noCommissions')}
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {t('commissionsInfo')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-paper)] shadow-sm">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
          <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-[var(--text-primary)]">{t('title')}</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {new Date(currentPeriod.start).toLocaleDateString(locale === 'es' ? 'es-PY' : 'en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {/* Store Commissions */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-[var(--text-primary)]">{t('storeOnline')}</h3>
              <p className="text-sm text-[var(--text-muted)]">
                {t('orders', { count: currentPeriod.store_orders })} × {rates.store}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {formatCurrency(currentPeriod.store_commission)}
              </p>
            </div>
          </div>

          {currentPeriod.store_orders === 0 && (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              {t('noOrdersThisPeriod')}
            </p>
          )}
        </div>

        {/* Service Commissions */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <Stethoscope className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-[var(--text-primary)]">{t('services')}</h3>
              <p className="text-sm text-[var(--text-muted)]">
                {t('appointments', { count: currentPeriod.service_appointments })} × {rates.service}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {formatCurrency(currentPeriod.service_commission)}
              </p>
            </div>
          </div>

          {currentPeriod.service_appointments === 0 && (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              {t('noAppointmentsThisPeriod')}
            </p>
          )}
        </div>

        {/* Total */}
        <div className="bg-[var(--bg-subtle)] p-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-[var(--text-primary)]">
              {t('totalCommissions')}
            </span>
            <span className="text-xl font-bold text-[var(--primary)]">
              {formatCurrency(currentPeriod.total_commission)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact version for sidebar or summary views
 */
interface CommissionSummaryProps {
  totalCommission: number
  storeOrders: number
  serviceAppointments: number
}

export function CommissionSummary({
  totalCommission,
  storeOrders,
  serviceAppointments,
}: CommissionSummaryProps): React.ReactElement {
  const t = useTranslations('billing.commissions')
  const locale = useLocale()

  // Format currency in Paraguayan Guaranies
  const formatCurrency = (amount: number): string => {
    return `₲${amount.toLocaleString(locale === 'es' ? 'es-PY' : 'en-US')}`
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-paper)] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[var(--primary)]" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {t('summary')}
          </span>
        </div>
        <span className="font-semibold text-[var(--text-primary)]">
          {formatCurrency(totalCommission)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1">
          <ShoppingBag className="h-3 w-3" />
          {t('orders', { count: storeOrders })}
        </span>
        <span className="flex items-center gap-1">
          <Stethoscope className="h-3 w-3" />
          {t('appointments', { count: serviceAppointments })}
        </span>
      </div>
    </div>
  )
}
