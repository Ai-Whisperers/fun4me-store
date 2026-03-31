'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  value?: string
  onChange: (date: string) => void
  placeholder?: string
  className?: string
}

export type { DatePickerProps }
export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  className = '',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Initialize current date to selected value or today
  useEffect(() => {
    if (value) {
      setCurrentDate(new Date(value))
    } else {
      setCurrentDate(new Date())
    }
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0] // YYYY-MM-DD format
  }

  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('es-PY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const handleDateSelect = (date: Date) => {
    onChange(formatDate(date))
    setIsOpen(false)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    if (!value) return false
    return formatDate(date) === value
  }

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={formatDisplayDate(value)}
          onClick={() => setIsOpen(!isOpen)}
          readOnly
          placeholder={placeholder}
          className="w-full cursor-pointer rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <Calendar className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 absolute left-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="rounded-lg p-2 transition hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="font-bold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="rounded-lg p-2 transition hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Day headers */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day) => (
                <div key={day} className="py-2 text-center text-xs font-bold text-gray-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentDate).map((date, index) => (
                <div key={index} className="aspect-square">
                  {date ? (
                    <button
                      onClick={() => handleDateSelect(date)}
                      className={`h-full w-full rounded-lg text-sm font-medium transition-all hover:bg-blue-50 hover:text-blue-600 ${
                        isSelected(date)
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : isToday(date)
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-700'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  ) : (
                    <div className="h-full w-full"></div>
                  )}
                </div>
              ))}
            </div>

            {/* Clear button */}
            {value && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <button
                  onClick={() => {
                    onChange('')
                    setIsOpen(false)
                  }}
                  className="w-full py-2 text-sm text-gray-500 transition hover:text-gray-700"
                >
                  Limpiar fecha
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
