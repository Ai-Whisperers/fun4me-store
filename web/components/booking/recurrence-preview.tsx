'use client'

import { useMemo } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'
  interval_value: number
  day_of_week?: number[]
  day_of_month?: number
  preferred_time: string
  end_date?: string
  max_occurrences?: number
}

interface RecurrencePreviewProps {
  pattern: RecurrencePattern
  startDate: string
  count?: number
  className?: string
}

export function RecurrencePreview({
  pattern,
  startDate,
  count = 5,
  className = '',
}: RecurrencePreviewProps): React.ReactElement {
  const t = useTranslations('booking.recurrencePreview')
  const locale = useLocale()

  const nextDates = useMemo(() => {
    const dates: Date[] = []
    const current = new Date(startDate)
    const endDate = pattern.end_date ? new Date(pattern.end_date) : null
    const maxOccurrences = pattern.max_occurrences || count

    while (dates.length < Math.min(count, maxOccurrences)) {
      // Check end date
      if (endDate && current > endDate) break

      // Add based on frequency
      switch (pattern.frequency) {
        case 'daily':
          if (dates.length > 0) {
            current.setDate(current.getDate() + pattern.interval_value)
          }
          dates.push(new Date(current))
          current.setDate(current.getDate() + 1)
          break

        case 'weekly':
          if (pattern.day_of_week && pattern.day_of_week.length > 0) {
            // Find next matching day of week
            let found = false
            for (let i = 0; i < 14 && !found; i++) {
              const dow = current.getDay()
              if (pattern.day_of_week.includes(dow)) {
                dates.push(new Date(current))
                found = true
              }
              current.setDate(current.getDate() + 1)
            }
          } else {
            dates.push(new Date(current))
            current.setDate(current.getDate() + 7 * pattern.interval_value)
          }
          break

        case 'biweekly':
          dates.push(new Date(current))
          current.setDate(current.getDate() + 14)
          break

        case 'monthly':
          if (pattern.day_of_month) {
            current.setDate(pattern.day_of_month)
          }
          dates.push(new Date(current))
          current.setMonth(current.getMonth() + pattern.interval_value)
          break

        case 'custom':
          dates.push(new Date(current))
          current.setDate(current.getDate() + pattern.interval_value)
          break

        default:
          dates.push(new Date(current))
          current.setDate(current.getDate() + 7)
      }
    }

    return dates
  }, [pattern, startDate, count])

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(locale === 'es' ? 'es-PY' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  const getFrequencyLabel = (): string => {
    switch (pattern.frequency) {
      case 'daily':
        return pattern.interval_value === 1
          ? t('frequencyLabels.daily')
          : t('frequencyLabels.everyXDays', { count: pattern.interval_value })
      case 'weekly':
        return t('frequencyLabels.weekly')
      case 'biweekly':
        return t('frequencyLabels.biweekly')
      case 'monthly':
        return pattern.interval_value === 1
          ? t('frequencyLabels.monthly')
          : t('frequencyLabels.everyXMonths', { count: pattern.interval_value })
      case 'custom':
        return t('frequencyLabels.everyXDays', { count: pattern.interval_value })
      default:
        return t('frequencyLabels.custom')
    }
  }

  return (
    <div className={`rounded-lg bg-purple-50 p-4 ${className}`}>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-purple-700">
        <Calendar className="h-4 w-4" />
        <span>{getFrequencyLabel()}</span>
        <span className="text-purple-500">•</span>
        <Clock className="h-4 w-4" />
        <span>{pattern.preferred_time}</span>
      </div>

      <p className="mb-2 text-xs text-purple-600">{t('nextAppointments', { count: nextDates.length })}</p>

      <div className="flex flex-wrap gap-2">
        {nextDates.map((date, index) => (
          <div
            key={index}
            className="rounded-full bg-white px-3 py-1 text-sm font-medium text-purple-700 shadow-sm"
          >
            {formatDate(date)}
          </div>
        ))}
      </div>

      {pattern.end_date && (
        <p className="mt-3 text-xs text-purple-500">
          {t('endsOn', {
            date: new Date(pattern.end_date).toLocaleDateString(
              locale === 'es' ? 'es-PY' : 'en-US',
              {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }
            ),
          })}
        </p>
      )}

      {pattern.max_occurrences && (
        <p className="mt-1 text-xs text-purple-500">
          {t('maxAppointments', { count: pattern.max_occurrences })}
        </p>
      )}
    </div>
  )
}
