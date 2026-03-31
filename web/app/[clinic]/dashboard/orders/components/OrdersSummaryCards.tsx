'use client'

/**
 * Orders Summary Cards Component
 *
 * REF-006: Extracted summary cards display
 */

import type { OrderSummary } from '../types'
import { SUMMARY_CARDS } from '../constants'

interface OrdersSummaryCardsProps {
  summary: OrderSummary
  statusFilter: string
  onFilterChange: (status: string) => void
}

const colorClasses: Record<string, string> = {
  yellow: 'text-yellow-600',
  blue: 'text-blue-600',
  purple: 'text-purple-600',
  indigo: 'text-indigo-600',
  cyan: 'text-cyan-600',
  green: 'text-green-600',
  red: 'text-red-600',
}

export function OrdersSummaryCards({
  summary,
  statusFilter,
  onFilterChange,
}: OrdersSummaryCardsProps): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {SUMMARY_CARDS.map((item) => (
        <button
          key={item.key}
          onClick={() => onFilterChange(item.key)}
          className={`rounded-xl border p-3 text-center transition-all ${
            statusFilter === item.key
              ? `border-${item.color}-400 bg-${item.color}-50`
              : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <div className={`text-2xl font-bold ${colorClasses[item.color]}`}>
            {summary[item.key as keyof OrderSummary] || 0}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">{item.label}</div>
        </button>
      ))}
    </div>
  )
}
