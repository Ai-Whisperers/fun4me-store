'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import type { SortOption } from '@/lib/types/store'
import { SORT_OPTION_LABELS } from '@/lib/types/store'

interface Props {
  value: SortOption
  onChange: (value: SortOption) => void
}

const SORT_OPTIONS: SortOption[] = [
  'relevance',
  'price_low_high',
  'price_high_low',
  'newest',
  'rating',
  'best_selling',
  'name_asc',
  'discount',
]

export default function SortDropdown({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (option: SortOption) => {
    onChange(option)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-white px-4 py-2 transition-colors hover:border-[var(--primary)]"
      >
        <span className="text-sm text-[var(--text-secondary)]">Ordenar:</span>
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {SORT_OPTION_LABELS[value]}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-lg border border-[var(--border-default)] bg-white shadow-lg">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--bg-subtle)] ${
                value === option ? 'bg-[var(--bg-subtle)]' : ''
              }`}
            >
              <span
                className={`text-sm ${value === option ? 'font-medium text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}
              >
                {SORT_OPTION_LABELS[option]}
              </span>
              {value === option && <Check className="h-4 w-4 text-[var(--primary)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
