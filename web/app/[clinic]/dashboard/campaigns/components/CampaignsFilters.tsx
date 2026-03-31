'use client'

/**
 * Campaigns Filters Component
 *
 * REF-006: Extracted filter controls from client component
 */

import { Filter, LayoutGrid, CalendarDays } from 'lucide-react'
import type { CampaignStatusFilter, ViewMode } from '../types'
import { STATUS_OPTIONS, CAMPAIGN_TYPE_OPTIONS } from '../constants'

interface CampaignsFiltersProps {
  statusFilter: CampaignStatusFilter
  onStatusChange: (value: CampaignStatusFilter) => void
  typeFilter: string
  onTypeChange: (value: string) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function CampaignsFilters({
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  viewMode,
  onViewModeChange,
}: CampaignsFiltersProps): React.ReactElement {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Filters */}
        <div className="flex flex-1 flex-wrap gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value as CampaignStatusFilter)}
              className="focus:ring-[var(--primary)]/20 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[var(--primary)] focus:ring-2"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value)}
            className="focus:ring-[var(--primary)]/20 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[var(--primary)] focus:ring-2"
          >
            <option value="all">Todos los tipos</option>
            {CAMPAIGN_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`rounded-md p-2 transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-[var(--primary)] shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Vista de cuadrícula"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange('calendar')}
            className={`rounded-md p-2 transition-colors ${
              viewMode === 'calendar'
                ? 'bg-white text-[var(--primary)] shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Vista de calendario"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
