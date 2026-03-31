'use client'

import { useState } from 'react'
import { RefreshCw, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'
  interval_value: number
  day_of_week?: number[]
  day_of_month?: number
  preferred_time: string
  end_date?: string
  max_occurrences?: number
}

interface RecurrenceSelectorProps {
  value: RecurrencePattern | null
  onChange: (pattern: RecurrencePattern | null) => void
  serviceDuration: number
  className?: string
}

export function RecurrenceSelector({
  value,
  onChange,
  serviceDuration,
  className = '',
}: RecurrenceSelectorProps): React.ReactElement {
  const t = useTranslations('booking.recurrence')
  const [isEnabled, setIsEnabled] = useState(value !== null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const FREQUENCY_OPTIONS = [
    { value: 'weekly', label: t('frequencies.weekly'), description: t('frequencies.weeklyDesc') },
    { value: 'biweekly', label: t('frequencies.biweekly'), description: t('frequencies.biweeklyDesc') },
    { value: 'monthly', label: t('frequencies.monthly'), description: t('frequencies.monthlyDesc') },
    { value: 'custom', label: t('frequencies.custom'), description: t('frequencies.customDesc') },
  ]

  const DAYS_OF_WEEK = [
    { value: 0, label: t('days.sun') },
    { value: 1, label: t('days.mon') },
    { value: 2, label: t('days.tue') },
    { value: 3, label: t('days.wed') },
    { value: 4, label: t('days.thu') },
    { value: 5, label: t('days.fri') },
    { value: 6, label: t('days.sat') },
  ]

  const defaultPattern: RecurrencePattern = {
    frequency: 'weekly',
    interval_value: 1,
    day_of_week: [new Date().getDay()],
    preferred_time: '10:00',
  }

  const handleToggle = () => {
    if (isEnabled) {
      setIsEnabled(false)
      onChange(null)
    } else {
      setIsEnabled(true)
      onChange(value || defaultPattern)
    }
  }

  const handleChange = (updates: Partial<RecurrencePattern>) => {
    if (!value) return
    onChange({ ...value, ...updates })
  }

  const toggleDayOfWeek = (day: number) => {
    if (!value) return
    const currentDays = value.day_of_week || []
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort()
    handleChange({ day_of_week: newDays.length > 0 ? newDays : [day] })
  }

  return (
    <div className={`rounded-xl border border-gray-200 bg-white ${className}`}>
      {/* Header Toggle */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-3 p-4"
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
            isEnabled ? 'bg-purple-100' : 'bg-gray-100'
          }`}
        >
          <RefreshCw
            className={`h-5 w-5 ${isEnabled ? 'text-purple-600' : 'text-gray-400'}`}
          />
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium text-[var(--text-primary)]">
            {t('title')}
          </p>
          <p className="text-sm text-gray-500">
            {isEnabled ? t('enabled') : t('disabled')}
          </p>
        </div>
        <div
          className={`h-6 w-11 rounded-full p-1 transition ${
            isEnabled ? 'bg-purple-600' : 'bg-gray-300'
          }`}
        >
          <div
            className={`h-4 w-4 rounded-full bg-white transition-transform ${
              isEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </div>
      </button>

      {/* Recurrence Options */}
      {isEnabled && value && (
        <div className="border-t border-gray-100 p-4">
          {/* Frequency Selection */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              {t('frequency')}
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FREQUENCY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    handleChange({ frequency: option.value as RecurrencePattern['frequency'] })
                  }
                  className={`rounded-lg border-2 p-3 text-left transition ${
                    value.frequency === option.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {option.label}
                  </p>
                  <p className="text-xs text-gray-500">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Day of Week (for weekly/biweekly) */}
          {['weekly', 'biweekly'].includes(value.frequency) && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                {t('daysOfWeek')}
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDayOfWeek(day.value)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition ${
                      value.day_of_week?.includes(day.value)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {value.frequency === 'monthly' && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                {t('dayOfMonth')}
              </label>
              <select
                value={value.day_of_month || 1}
                onChange={(e) => handleChange({ day_of_month: parseInt(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-purple-500 focus:outline-none"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Interval */}
          {value.frequency === 'custom' && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                {t('repeatEvery')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={value.interval_value}
                  onChange={(e) => handleChange({ interval_value: parseInt(e.target.value) || 1 })}
                  className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-center focus:border-purple-500 focus:outline-none"
                />
                <span className="text-gray-600">{t('daysUnit')}</span>
              </div>
            </div>
          )}

          {/* Preferred Time */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              {t('preferredTime')}
            </label>
            <input
              type="time"
              value={value.preferred_time}
              onChange={(e) => handleChange({ preferred_time: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Advanced Options */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            />
            {t('advancedOptions')}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 rounded-lg bg-gray-50 p-4">
              {/* End Date */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  {t('endDate')}
                </label>
                <input
                  type="date"
                  value={value.end_date || ''}
                  onChange={(e) => handleChange({ end_date: e.target.value || undefined })}
                  min={new Date().toISOString().split('T')[0]}
                  className="rounded-lg border border-gray-200 px-3 py-2 focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Max Occurrences */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  {t('maxOccurrences')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={value.max_occurrences || ''}
                  onChange={(e) =>
                    handleChange({ max_occurrences: parseInt(e.target.value) || undefined })
                  }
                  placeholder={t('noLimit')}
                  className="w-32 rounded-lg border border-gray-200 px-3 py-2 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
