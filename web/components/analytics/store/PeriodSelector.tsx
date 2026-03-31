'use client'

/**
 * Period Selector Component
 *
 * Date range selector for analytics period filtering.
 */

import type { PeriodDays } from './types'

interface PeriodOption {
  value: PeriodDays
  label: string
}

interface PeriodSelectorProps {
  period: PeriodDays
  onPeriodChange: (period: PeriodDays) => void
  options?: PeriodOption[]
}

const DEFAULT_OPTIONS: PeriodOption[] = [
  { value: 7, label: '7 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
]

export function PeriodSelector({
  period,
  onPeriodChange,
  options = DEFAULT_OPTIONS,
}: PeriodSelectorProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
      {options.map((p) => (
        <button
          key={p.value}
          onClick={() => onPeriodChange(p.value)}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            period === p.value
              ? 'bg-white text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
