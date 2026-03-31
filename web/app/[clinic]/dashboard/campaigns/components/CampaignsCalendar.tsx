'use client'

/**
 * Campaigns Calendar Component
 *
 * REF-006: Extracted calendar view from client component
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Campaign } from '../types'
import { WEEK_DAYS } from '../constants'

interface CampaignsCalendarProps {
  campaigns: Campaign[]
  currentMonth: Date
  onNavigateMonth: (direction: 'prev' | 'next') => void
  onEditCampaign: (campaign: Campaign) => void
}

export function CampaignsCalendar({
  campaigns,
  currentMonth,
  onNavigateMonth,
  onEditCampaign,
}: CampaignsCalendarProps): React.ReactElement {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()

  const days: (number | null)[] = []
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const getCampaignsForDay = (day: number): Campaign[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const date = new Date(dateStr)
    return campaigns.filter((c) => {
      const start = new Date(c.start_date)
      const end = new Date(c.end_date)
      return date >= start && date <= end
    })
  }

  const today = new Date()

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <button
          onClick={() => onNavigateMonth('prev')}
          className="rounded-lg p-2 transition-colors hover:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold text-[var(--text-primary)]">
          {currentMonth.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          onClick={() => onNavigateMonth('next')}
          className="rounded-lg p-2 transition-colors hover:bg-gray-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4">
        {/* Week days header */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />
            }

            const dayCampaigns = getCampaignsForDay(day)
            const isToday =
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear()

            return (
              <div
                key={day}
                className={`aspect-square rounded-lg border p-1 transition-colors ${
                  isToday
                    ? 'bg-[var(--primary)]/5 border-[var(--primary)]'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div
                  className={`mb-1 text-xs font-medium ${isToday ? 'text-[var(--primary)]' : 'text-gray-700'}`}
                >
                  {day}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  {dayCampaigns.slice(0, 2).map((campaign) => (
                    <div
                      key={campaign.id}
                      className={`cursor-pointer truncate rounded px-1 py-0.5 text-[10px] hover:opacity-80 ${
                        campaign.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : campaign.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                      onClick={() => onEditCampaign(campaign)}
                      title={campaign.name}
                    >
                      {campaign.name}
                    </div>
                  ))}
                  {dayCampaigns.length > 2 && (
                    <div className="px-1 text-[10px] text-gray-500">
                      +{dayCampaigns.length - 2} más
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
