'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ServiceCard } from './service-card'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { ClinicConfig } from '@/lib/clinics'
import { CategoryFilter, extractCategories } from './category-filter'
import { EmptyStateNoSearchResults } from '@/components/ui/empty-state'
import type { Service, ServiceVariant } from '@/lib/types/services'

interface ServicesGridProps {
  services: Service[]
  config: ClinicConfig
}

export function ServicesGrid({ services, config }: ServicesGridProps) {
  const { clinic } = useParams() as { clinic: string }
  const t = useTranslations('services')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showFilters, setShowFilters] = useState(true)

  // Extract categories and counts from services
  const { categories, counts } = useMemo(() => extractCategories(services), [services])

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      // Category filter
      if (selectedCategory !== 'all' && service.category !== selectedCategory) {
        return false
      }

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase()

        // Check Title
        if (service.title.toLowerCase().includes(term)) return true

        // Check Summary/Description
        if (service.summary?.toLowerCase().includes(term)) return true
        if (service.details?.description?.toLowerCase().includes(term)) return true

        // Check Includes List
        if (service.details?.includes?.some((item: string) => item.toLowerCase().includes(term)))
          return true

        // Check Variants (Sub-services)
        if (
          service.variants?.some((variant: ServiceVariant) =>
            variant.name.toLowerCase().includes(term)
          )
        )
          return true

        return false
      }

      return true
    })
  }, [services, searchTerm, selectedCategory])

  const clearFilters = (): void => {
    setSearchTerm('')
    setSelectedCategory('all')
  }

  const hasActiveFilters = searchTerm || selectedCategory !== 'all'

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <section aria-labelledby="filters-heading">
        <h2 id="filters-heading" className="sr-only">
          {t('filterHeading')}
        </h2>
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">
                <Search className="h-5 w-5" aria-hidden="true" />
              </div>
              <input
                type="search"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label={t('searchPlaceholder')}
                className="min-h-[48px] w-full rounded-full border border-gray-200 bg-white py-3 pl-12 pr-12 text-base text-[var(--text-primary)] shadow-lg outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] sm:py-4"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label={t('clearSearch')}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex min-h-[48px] items-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition-all ${
                showFilters
                  ? 'bg-[var(--primary)] text-white shadow-lg'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-[var(--primary)]'
              }`}
              aria-expanded={showFilters}
              aria-controls="category-filters"
              aria-label={showFilters ? t('hideFilters') : t('showFilters')}
            >
              <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">{t('filters')}</span>
            </button>
          </div>

          {/* Category Filter */}
          {showFilters && categories.length > 1 && (
            <div id="category-filters" className="animate-in slide-in-from-top-2 duration-200">
              <CategoryFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                serviceCounts={counts}
                variant="chips"
                className="justify-center"
              />
            </div>
          )}

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div
              className="flex items-center justify-center gap-2 text-sm text-gray-500"
              role="status"
              aria-live="polite"
            >
              <span>
                {t('showingResults', { filtered: filteredServices.length, total: services.length })}
              </span>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 font-bold text-[var(--primary)] hover:underline"
                aria-label={t('clearAllFilters')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {t('clearFiltersButton')}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Grid */}
      <section aria-labelledby="services-heading">
        <h2 id="services-heading" className="sr-only">
          {t('servicesList')}
        </h2>
        {filteredServices.length > 0 ? (
          <div
            className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3"
            role="list"
          >
            {filteredServices.map((service) => (
              <div key={service.id} role="listitem">
                <ServiceCard service={service} config={config} clinic={clinic} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyStateNoSearchResults
            query={searchTerm || selectedCategory}
            onClear={clearFilters}
            className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-20"
          />
        )}
      </section>
    </div>
  )
}
