'use client'

import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'

interface DateFilterProps {
  currentDate: string
  clinic: string
}

export function DateFilter({ currentDate, clinic: _clinic }: DateFilterProps) {
  const router = useRouter()

  const handleDateChange = (date: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('date', date)
    router.push(url.pathname + url.search)
  }

  const goToDay = (offset: number) => {
    const date = new Date(currentDate)
    date.setDate(date.getDate() + offset)
    handleDateChange(date.toISOString().split('T')[0])
  }

  const goToToday = () => {
    handleDateChange(new Date().toISOString().split('T')[0])
  }

  const isToday = currentDate === new Date().toISOString().split('T')[0]

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => goToDay(-1)}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-gray-200 bg-white p-2 transition-colors hover:bg-gray-50"
        title="Día anterior"
      >
        <Icons.ChevronLeft className="h-5 w-5" />
      </button>

      <div className="relative">
        <input
          type="date"
          value={currentDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="focus:ring-[var(--primary)]/20 min-h-[44px] rounded-lg border border-gray-200 bg-white px-4 py-3 pr-10 text-sm font-medium outline-none focus:border-[var(--primary)] focus:ring-2"
        />
      </div>

      <button
        onClick={() => goToDay(1)}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-gray-200 bg-white p-2 transition-colors hover:bg-gray-50"
        title="Día siguiente"
      >
        <Icons.ChevronRight className="h-5 w-5" />
      </button>

      {!isToday && (
        <button
          onClick={goToToday}
          className="min-h-[44px] rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Hoy
        </button>
      )}
    </div>
  )
}
