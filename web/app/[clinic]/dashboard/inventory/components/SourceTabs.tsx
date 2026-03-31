'use client'

/**
 * Source Tabs Component
 *
 * REF-006: Source filter tabs extracted from client component
 */

import type { ProductSource } from '../types'
import { sourceTabOptions } from '../constants'

interface SourceTabsProps {
  sourceFilter: ProductSource
  onSourceChange: (source: ProductSource) => void
  sourceSummary: { own?: number; catalog?: number }
}

export function SourceTabs({
  sourceFilter,
  onSourceChange,
  sourceSummary,
}: SourceTabsProps): React.ReactElement {
  const getCount = (value: ProductSource): number | undefined => {
    if (value === 'all') {
      const own = sourceSummary.own ?? 0
      const catalog = sourceSummary.catalog ?? 0
      return own + catalog > 0 ? own + catalog : undefined
    }
    return sourceSummary[value]
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-default)] p-2 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row">
        {sourceTabOptions.map((tab) => {
          const count = getCount(tab.value)
          const isActive = sourceFilter === tab.value

          return (
            <button
              key={tab.value}
              onClick={() => onSourceChange(tab.value)}
              className={`flex flex-1 items-center justify-center gap-3 rounded-xl px-4 py-3 transition-all ${
                isActive
                  ? 'bg-[var(--primary)] text-white shadow-lg'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-[var(--text-muted)]'}>
                {tab.icon}
              </span>
              <span className="font-bold">{tab.label}</span>
              {count !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    isActive
                      ? 'bg-[var(--bg-default)]/20 text-white'
                      : 'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
