'use client'

/**
 * Store Analytics Client Component
 *
 * Main orchestrator for store analytics dashboard.
 * Manages state, data fetching, and tab navigation.
 */

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, ArrowLeft, Loader2 } from 'lucide-react'
import type { AnalyticsTab, PeriodDays } from './types'
import { useStoreAnalytics } from './hooks/use-store-analytics'
import { PeriodSelector } from './PeriodSelector'
import { AnalyticsTabNav } from './AnalyticsTabNav'
import { SalesTab, MarginsTab, InventoryTab } from './tabs'

interface StoreAnalyticsClientProps {
  clinic: string
}

export function StoreAnalyticsClient({ clinic }: StoreAnalyticsClientProps): React.ReactElement {
  const [period, setPeriod] = useState<PeriodDays>(30)
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('sales')

  const { data, marginData, turnoverData, isLoading, error, refetch } = useStoreAnalytics({
    period,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p style={{ color: 'var(--status-error)' }}>{error}</p>
        <button
          onClick={() => refetch()}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-white"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-[var(--text-secondary)]">No hay datos disponibles</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/${clinic}/dashboard/analytics`}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
          </Link>
          <div className="rounded-lg bg-[var(--primary)] bg-opacity-10 p-2">
            <ShoppingCart className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Analíticas de Tienda
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Métricas de ventas, productos y cupones
            </p>
          </div>
        </div>

        <PeriodSelector period={period} onPeriodChange={setPeriod} />
      </div>

      {/* Tab Navigation */}
      <AnalyticsTabNav activeTab={activeTab} onTabChange={setActiveTab} clinic={clinic} />

      {/* Tab Content */}
      {activeTab === 'sales' && <SalesTab data={data} />}
      {activeTab === 'margins' && marginData && <MarginsTab data={marginData} />}
      {activeTab === 'inventory' && turnoverData && <InventoryTab data={turnoverData} />}

      {/* Generated At */}
      <div className="text-center text-sm text-[var(--text-secondary)]">
        Datos actualizados: {new Date(data.generatedAt).toLocaleString('es-PY')}
      </div>
    </div>
  )
}
