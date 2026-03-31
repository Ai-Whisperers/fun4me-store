'use client'

/**
 * Analytics Tab Navigation Component
 *
 * Tab navigation for switching between sales, margins, and inventory views.
 */

import Link from 'next/link'
import { TrendingUp, Percent, RotateCcw, Users } from 'lucide-react'
import type { AnalyticsTab } from './types'

interface AnalyticsTabNavProps {
  activeTab: AnalyticsTab
  onTabChange: (tab: AnalyticsTab) => void
  clinic: string
}

interface TabConfig {
  id: AnalyticsTab
  label: string
  icon: React.ElementType
}

const TABS: TabConfig[] = [
  { id: 'sales', label: 'Ventas', icon: TrendingUp },
  { id: 'margins', label: 'Márgenes', icon: Percent },
  { id: 'inventory', label: 'Inventario', icon: RotateCcw },
]

export function AnalyticsTabNav({
  activeTab,
  onTabChange,
  clinic,
}: AnalyticsTabNavProps): React.ReactElement {
  return (
    <div className="flex border-b border-gray-200">
      {TABS.map((tab) => {
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        )
      })}
      <Link
        href={`/${clinic}/dashboard/analytics/customers`}
        className="flex items-center gap-2 border-b-2 border-transparent px-6 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <Users className="h-4 w-4" />
        Clientes
      </Link>
    </div>
  )
}
