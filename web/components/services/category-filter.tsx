'use client'

import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import * as Icons from 'lucide-react'

export interface ServiceCategory {
  id: string
  label: string
  icon: keyof typeof Icons
  description?: string
}

// Category ID to translation key mapping
const CATEGORY_KEYS: Record<string, string> = {
  all: 'all',
  medical: 'medical',
  preventative: 'prevention',
  diagnostics: 'diagnostic',
  surgery: 'surgery',
  dental: 'dental',
  grooming: 'grooming',
  hospitalization: 'hospitalization',
  rehabilitation: 'rehabilitation',
}

// Default categories - labels will be overridden by translations
export const DEFAULT_CATEGORIES: ServiceCategory[] = [
  { id: 'all', label: 'All', icon: 'LayoutGrid', description: '' },
  { id: 'medical', label: 'Medical', icon: 'Stethoscope', description: '' },
  { id: 'preventative', label: 'Prevention', icon: 'ShieldCheck', description: '' },
  { id: 'diagnostics', label: 'Diagnostic', icon: 'Microscope', description: '' },
  { id: 'surgery', label: 'Surgery', icon: 'Scissors', description: '' },
  { id: 'dental', label: 'Dental', icon: 'Smile', description: '' },
  { id: 'grooming', label: 'Grooming', icon: 'Sparkles', description: '' },
  { id: 'hospitalization', label: 'Hospitalization', icon: 'BedDouble', description: '' },
  { id: 'rehabilitation', label: 'Rehabilitation', icon: 'Activity', description: '' },
]

interface CategoryFilterProps {
  categories: ServiceCategory[]
  selectedCategory: string
  onCategoryChange: (categoryId: string) => void
  serviceCounts?: Record<string, number>
  variant?: 'chips' | 'tabs' | 'dropdown'
  className?: string
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  serviceCounts,
  variant = 'chips',
  className,
}: CategoryFilterProps): React.ReactElement {
  const t = useTranslations('services.categories')
  const tDesc = useTranslations('services.categoryDescriptions')

  // Helper to get translated label
  const getLabel = (categoryId: string, fallbackLabel: string): string => {
    const key = CATEGORY_KEYS[categoryId]
    if (key) {
      try {
        return t(key)
      } catch (_error: unknown) {
        return fallbackLabel
      }
    }
    return fallbackLabel
  }

  // Helper to get translated description
  const getDescription = (categoryId: string): string => {
    const key = CATEGORY_KEYS[categoryId]
    if (key) {
      try {
        return tDesc(key)
      } catch (_error: unknown) {
        return ''
      }
    }
    return ''
  }

  if (variant === 'dropdown') {
    return (
      <div className={cn('relative', className)}>
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="min-h-[48px] w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 font-medium text-[var(--text-primary)] outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {getLabel(category.id, category.label)}
              {serviceCounts?.[category.id] !== undefined && ` (${serviceCounts[category.id]})`}
            </option>
          ))}
        </select>
        <Icons.ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
      </div>
    )
  }

  if (variant === 'tabs') {
    return (
      <div className={cn('border-b border-gray-200', className)}>
        <nav className="scrollbar-hide flex gap-1 overflow-x-auto pb-px" role="tablist">
          {categories.map((category) => {
            const IconComponent = Icons[category.icon] as React.ComponentType<{
              className?: string
            }>
            const isSelected = selectedCategory === category.id

            return (
              <button
                key={category.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  'flex min-h-[44px] items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold transition-colors',
                  isSelected
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                {IconComponent && <IconComponent className="h-4 w-4" />}
                <span>{getLabel(category.id, category.label)}</span>
                {serviceCounts?.[category.id] !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-bold',
                      isSelected
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                        : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {serviceCounts[category.id]}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    )
  }

  // Default: chips variant
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {categories.map((category) => {
        const IconComponent = Icons[category.icon] as React.ComponentType<{ className?: string }>
        const isSelected = selectedCategory === category.id
        const count = serviceCounts?.[category.id]

        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all',
              isSelected
                ? 'bg-[var(--primary)] text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-[var(--primary)] hover:text-[var(--primary)]'
            )}
            title={getDescription(category.id)}
          >
            {IconComponent && <IconComponent className="h-4 w-4" />}
            <span>{getLabel(category.id, category.label)}</span>
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  'min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-xs font-bold',
                  isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Utility to extract unique categories from services and count them
export function extractCategories(
  services: Array<{ category?: string }>,
  customCategories?: ServiceCategory[]
): { categories: ServiceCategory[]; counts: Record<string, number> } {
  const categorySet = new Set<string>()
  const counts: Record<string, number> = { all: services.length }

  services.forEach((service) => {
    if (service.category) {
      categorySet.add(service.category)
      counts[service.category] = (counts[service.category] || 0) + 1
    }
  })

  const baseCategories = customCategories || DEFAULT_CATEGORIES

  // Filter to only include "all" + categories that exist in services
  const categories = baseCategories.filter((cat) => cat.id === 'all' || categorySet.has(cat.id))

  return { categories, counts }
}
