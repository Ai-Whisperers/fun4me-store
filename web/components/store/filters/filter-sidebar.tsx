'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Star, Dog, Cat, Search, X } from 'lucide-react'
import type {
  ProductFilters,
  AvailableFilters,
  Species,
  LifeStage,
  BreedSize,
  HealthCondition,
} from '@/lib/types/store'
import {
  SPECIES_LABELS,
  LIFE_STAGE_LABELS,
  BREED_SIZE_LABELS,
  HEALTH_CONDITION_LABELS,
} from '@/lib/types/store'
import PriceRangeSlider from './price-range-slider'
import CategoryTree from './category-tree'

interface Props {
  filters: ProductFilters
  availableFilters: AvailableFilters
  onFiltersChange: (filters: ProductFilters) => void
  onClearFilters: () => void
}

interface FilterSectionProps {
  title: string
  defaultOpen?: boolean
  badge?: number
  children: React.ReactNode
}

function FilterSection({ title, defaultOpen = true, badge, children }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="mb-4 border-b border-[var(--border-default)] pb-4 last:mb-0 last:border-b-0 last:pb-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
            {title}
          </span>
          {badge !== undefined && badge > 0 && (
            <span className="rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-xs text-white">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
        )}
      </button>
      {isOpen && <div className="mt-3">{children}</div>}
    </div>
  )
}

export default function FilterSidebar({
  filters,
  availableFilters,
  onFiltersChange,
  onClearFilters,
}: Props) {
  const [brandSearch, setBrandSearch] = useState('')

  const updateFilter = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleArrayFilter = <T extends Species | LifeStage | BreedSize | HealthCondition>(
    key: 'species' | 'life_stages' | 'breed_sizes' | 'health_conditions',
    value: T
  ) => {
    const currentValues = (filters[key] || []) as T[]
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value]
    updateFilter(key, (newValues.length > 0 ? newValues : undefined) as ProductFilters[typeof key])
  }

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (value === undefined || value === false) return false
    if (Array.isArray(value) && value.length === 0) return false
    if (key === 'search') return false
    return true
  })

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.category) count++
    if (filters.brand) count++
    if (filters.species?.length) count += filters.species.length
    if (filters.life_stages?.length) count += filters.life_stages.length
    if (filters.price_min !== undefined || filters.price_max !== undefined) count++
    if (filters.in_stock_only) count++
    if (filters.on_sale) count++
    if (filters.new_arrivals) count++
    if (filters.best_sellers) count++
    if (filters.min_rating) count++
    return count
  }, [filters])

  // Filter brands by search
  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return availableFilters.brands.slice(0, 20)
    const search = brandSearch.toLowerCase()
    return availableFilters.brands.filter((b) => b.name.toLowerCase().includes(search))
  }, [availableFilters.brands, brandSearch])

  // Primary species (dogs/cats) vs others
  const primarySpecies: Species[] = ['perro', 'gato']
  const otherSpecies = availableFilters.species.filter((s) => !primarySpecies.includes(s.value))

  const handleCategorySelect = (slug: string | undefined, _includeChildren: boolean) => {
    updateFilter('category', slug)
  }

  return (
    <div className="sticky top-24 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] bg-gray-50 p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Filtros</h2>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-medium text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
            aria-label="Limpiar todos los filtros"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Limpiar
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-4">
        {/* Quick Filters - Compact Pills */}
        <FilterSection title="Filtros Rápidos">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateFilter('in_stock_only', !filters.in_stock_only)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                filters.in_stock_only
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              En stock
            </button>
            <button
              onClick={() => updateFilter('on_sale', !filters.on_sale)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                filters.on_sale
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏷️ Ofertas
            </button>
            <button
              onClick={() => updateFilter('new_arrivals', !filters.new_arrivals)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                filters.new_arrivals
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✨ Nuevos
            </button>
            <button
              onClick={() => updateFilter('best_sellers', !filters.best_sellers)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                filters.best_sellers
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🔥 Top ventas
            </button>
          </div>
        </FilterSection>

        {/* Species - Primary Focus */}
        <FilterSection title="Mascota" badge={filters.species?.length}>
          <div className="space-y-2">
            {/* Primary: Dogs & Cats */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => toggleArrayFilter('species', 'perro')}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                  filters.species?.includes('perro')
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Dog className="h-5 w-5" />
                Perros
              </button>
              <button
                onClick={() => toggleArrayFilter('species', 'gato')}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                  filters.species?.includes('gato')
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Cat className="h-5 w-5" />
                Gatos
              </button>
            </div>

            {/* Other Species - Smaller */}
            {otherSpecies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {otherSpecies.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => toggleArrayFilter('species', s.value)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                      filters.species?.includes(s.value)
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {SPECIES_LABELS[s.value]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </FilterSection>

        {/* Categories - Tree View */}
        {availableFilters.categories.length > 0 && (
          <FilterSection title="Categoría" badge={filters.category ? 1 : 0}>
            <CategoryTree
              categories={availableFilters.categories}
              selectedCategory={filters.category}
              onCategorySelect={handleCategorySelect}
            />
          </FilterSection>
        )}

        {/* Price Range */}
        <FilterSection
          title="Precio"
          badge={filters.price_min !== undefined || filters.price_max !== undefined ? 1 : 0}
        >
          <PriceRangeSlider
            min={availableFilters.price_range.min}
            max={availableFilters.price_range.max}
            currentMin={filters.price_min}
            currentMax={filters.price_max}
            onChange={(min, max) => {
              onFiltersChange({
                ...filters,
                price_min: min,
                price_max: max,
              })
            }}
          />
        </FilterSection>

        {/* Brands - With Search */}
        {availableFilters.brands.length > 0 && (
          <FilterSection title="Marca" badge={filters.brand ? 1 : 0} defaultOpen={false}>
            {/* Brand Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar marca..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              {brandSearch && (
                <button
                  onClick={() => setBrandSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Limpiar busqueda de marca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Brand List */}
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
              {filteredBrands.length === 0 ? (
                <p className="py-2 text-center text-sm text-gray-500">No se encontraron marcas</p>
              ) : (
                filteredBrands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() =>
                      updateFilter('brand', filters.brand === brand.slug ? undefined : brand.slug)
                    }
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-all ${
                      filters.brand === brand.slug
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-[var(--text-secondary)] hover:bg-gray-100'
                    }`}
                  >
                    <span className="truncate font-medium">{brand.name}</span>
                    {filters.brand === brand.slug && <span className="text-xs">✓</span>}
                  </button>
                ))
              )}
              {!brandSearch && availableFilters.brands.length > 20 && (
                <p className="pt-2 text-center text-xs text-gray-400">Busca para ver más marcas</p>
              )}
            </div>
          </FilterSection>
        )}

        {/* Life Stage */}
        {availableFilters.life_stages.length > 0 && (
          <FilterSection
            title="Etapa de Vida"
            badge={filters.life_stages?.length}
            defaultOpen={false}
          >
            <div className="flex flex-wrap gap-2">
              {availableFilters.life_stages.map((ls) => (
                <button
                  key={ls.value}
                  onClick={() => toggleArrayFilter('life_stages', ls.value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    filters.life_stages?.includes(ls.value)
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {LIFE_STAGE_LABELS[ls.value]}
                </button>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Rating */}
        <FilterSection title="Calificación" badge={filters.min_rating ? 1 : 0} defaultOpen={false}>
          <div className="space-y-1">
            {[4, 3, 2].map((rating) => (
              <button
                key={rating}
                onClick={() =>
                  updateFilter('min_rating', filters.min_rating === rating ? undefined : rating)
                }
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 transition-all ${
                  filters.min_rating === rating
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-[var(--text-muted)]">y más</span>
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Breed Size - Collapsed by default */}
        {availableFilters.breed_sizes.length > 0 && (
          <FilterSection
            title="Tamaño de Raza"
            badge={filters.breed_sizes?.length}
            defaultOpen={false}
          >
            <div className="flex flex-wrap gap-2">
              {availableFilters.breed_sizes.map((bs) => (
                <button
                  key={bs.value}
                  onClick={() => toggleArrayFilter('breed_sizes', bs.value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    filters.breed_sizes?.includes(bs.value)
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {BREED_SIZE_LABELS[bs.value]}
                </button>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Health Conditions - Collapsed by default */}
        {availableFilters.health_conditions.length > 0 && (
          <FilterSection
            title="Necesidades Especiales"
            badge={filters.health_conditions?.length}
            defaultOpen={false}
          >
            <div className="space-y-1">
              {availableFilters.health_conditions.map((hc) => (
                <button
                  key={hc.value}
                  onClick={() => toggleArrayFilter('health_conditions', hc.value)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all ${
                    filters.health_conditions?.includes(hc.value)
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--text-secondary)] hover:bg-gray-100'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border-2 ${
                      filters.health_conditions?.includes(hc.value)
                        ? 'border-white bg-white/20'
                        : 'border-gray-300'
                    }`}
                  >
                    {filters.health_conditions?.includes(hc.value) && (
                      <span className="text-xs">✓</span>
                    )}
                  </span>
                  {HEALTH_CONDITION_LABELS[hc.value]}
                </button>
              ))}
            </div>
          </FilterSection>
        )}
      </div>
    </div>
  )
}
