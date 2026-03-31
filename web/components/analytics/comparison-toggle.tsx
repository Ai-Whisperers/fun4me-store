'use client'

import { ArrowLeftRight } from 'lucide-react'

export type ComparisonPeriod = 'previous_period' | 'previous_year' | 'none'

interface ComparisonToggleProps {
  value: ComparisonPeriod
  onChange: (value: ComparisonPeriod) => void
  className?: string
}

const OPTIONS: { value: ComparisonPeriod; label: string }[] = [
  { value: 'none', label: 'Sin comparar' },
  { value: 'previous_period', label: 'Período anterior' },
  { value: 'previous_year', label: 'Año anterior' },
]

export function ComparisonToggle({
  value,
  onChange,
  className = '',
}: ComparisonToggleProps): React.ReactElement {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ArrowLeftRight className="h-4 w-4 text-gray-400" />
      <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              value === option.value
                ? 'bg-[var(--primary)] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Utility to calculate comparison date range
export function getComparisonDateRange(
  startDate: string,
  endDate: string,
  comparison: ComparisonPeriod
): { startDate: string; endDate: string } | null {
  if (comparison === 'none') return null

  const start = new Date(startDate)
  const end = new Date(endDate)
  const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

  if (comparison === 'previous_period') {
    const newEnd = new Date(start)
    newEnd.setDate(newEnd.getDate() - 1)
    const newStart = new Date(newEnd)
    newStart.setDate(newStart.getDate() - daysDiff + 1)

    return {
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0],
    }
  }

  if (comparison === 'previous_year') {
    const newStart = new Date(start)
    newStart.setFullYear(newStart.getFullYear() - 1)
    const newEnd = new Date(end)
    newEnd.setFullYear(newEnd.getFullYear() - 1)

    return {
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0],
    }
  }

  return null
}
