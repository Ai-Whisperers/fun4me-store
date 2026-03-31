'use client'

import { useEffect, useRef, useCallback } from 'react'
import { X, SlidersHorizontal, Star, Dog, Cat, Bird, Fish, Rabbit } from 'lucide-react'
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

interface Props {
  isOpen: boolean
  onClose: () => void
  filters: ProductFilters
  availableFilters: AvailableFilters
  onFiltersChange: (filters: ProductFilters) => void
  onClearFilters: () => void
  onApply: () => void
  resultCount: number
}

const SPECIES_ICONS: Record<Species, React.ReactNode> = {
  perro: <Dog className="h-4 w-4" />,
  gato: <Cat className="h-4 w-4" />,
  ave: <Bird className="h-4 w-4" />,
  reptil: <span className="h-4 w-4 text-center">🦎</span>,
  pez: <Fish className="h-4 w-4" />,
  roedor: <span className="h-4 w-4 text-center">🐹</span>,
  conejo: <Rabbit className="h-4 w-4" />,
  otro: <span className="h-4 w-4 text-center">🐾</span>,
}

export default function FilterDrawer({
  isOpen,
  onClose,
  filters,
  availableFilters,
  onFiltersChange,
  onClearFilters,
  onApply,
  resultCount,
}: Props) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Handle keyboard events (escape and focus trap)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || !drawerRef.current) return

      // Close on Escape
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Focus trap on Tab
      if (e.key === 'Tab') {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    },
    [isOpen, onClose]
  )

  // Lock body scroll and manage focus
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleKeyDown)
      // Focus first focusable element in drawer
      setTimeout(() => {
        const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        firstFocusable?.focus()
      }, 100)
    } else {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus to previous element
      previousActiveElement.current?.focus()
    }
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

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

  const handleApplyAndClose = () => {
    onApply()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-drawer-title"
        className="animate-slide-up absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl bg-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            <span id="filter-drawer-title" className="text-lg font-semibold">Filtros</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-[var(--bg-subtle)]"
            aria-label="Cerrar filtros"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {/* Quick Filters */}
          <div>
            <h3 className="mb-3 font-semibold text-[var(--text-primary)]">Filtros Rápidos</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateFilter('in_stock_only', !filters.in_stock_only)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  filters.in_stock_only
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                En Stock
              </button>
              <button
                onClick={() => updateFilter('on_sale', !filters.on_sale)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  filters.on_sale
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                En Oferta
              </button>
              <button
                onClick={() => updateFilter('new_arrivals', !filters.new_arrivals)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  filters.new_arrivals
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                Nuevos
              </button>
              <button
                onClick={() => updateFilter('best_sellers', !filters.best_sellers)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  filters.best_sellers
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                Más Vendidos
              </button>
            </div>
          </div>

          {/* Categories */}
          {availableFilters.categories.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold text-[var(--text-primary)]">Categoría</h3>
              <div className="flex flex-wrap gap-2">
                {availableFilters.categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() =>
                      updateFilter('category', filters.category === cat.slug ? undefined : cat.slug)
                    }
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      filters.category === cat.slug
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Species */}
          <div>
            <h3 className="mb-3 font-semibold text-[var(--text-primary)]">Mascota</h3>
            <div className="grid grid-cols-4 gap-2">
              {availableFilters.species.map((s) => (
                <button
                  key={s.value}
                  onClick={() => toggleArrayFilter('species', s.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl p-3 text-sm transition-colors ${
                    filters.species?.includes(s.value)
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  <span className="text-xl">{SPECIES_ICONS[s.value]}</span>
                  <span className="text-xs">{SPECIES_LABELS[s.value]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Life Stage */}
          <div>
            <h3 className="mb-3 font-semibold text-[var(--text-primary)]">Etapa de Vida</h3>
            <div className="flex flex-wrap gap-2">
              {availableFilters.life_stages.map((ls) => (
                <button
                  key={ls.value}
                  onClick={() => toggleArrayFilter('life_stages', ls.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    filters.life_stages?.includes(ls.value)
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  {LIFE_STAGE_LABELS[ls.value]}
                </button>
              ))}
            </div>
          </div>

          {/* Breed Size */}
          <div>
            <h3 className="mb-3 font-semibold text-[var(--text-primary)]">Tamaño de Raza</h3>
            <div className="flex flex-wrap gap-2">
              {availableFilters.breed_sizes.map((bs) => (
                <button
                  key={bs.value}
                  onClick={() => toggleArrayFilter('breed_sizes', bs.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    filters.breed_sizes?.includes(bs.value)
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  {BREED_SIZE_LABELS[bs.value]}
                </button>
              ))}
            </div>
          </div>

          {/* Health Conditions */}
          <div>
            <h3 className="mb-3 font-semibold text-[var(--text-primary)]">
              Necesidades Especiales
            </h3>
            <div className="flex flex-wrap gap-2">
              {availableFilters.health_conditions.map((hc) => (
                <button
                  key={hc.value}
                  onClick={() => toggleArrayFilter('health_conditions', hc.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    filters.health_conditions?.includes(hc.value)
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  {HEALTH_CONDITION_LABELS[hc.value]}
                </button>
              ))}
            </div>
          </div>

          {/* Brands */}
          {availableFilters.brands.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold text-[var(--text-primary)]">Marca</h3>
              <div className="flex flex-wrap gap-2">
                {availableFilters.brands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() =>
                      updateFilter('brand', filters.brand === brand.slug ? undefined : brand.slug)
                    }
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      filters.brand === brand.slug
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price Range */}
          <div>
            <h3 className="mb-3 font-semibold text-[var(--text-primary)]">Precio</h3>
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
          </div>

          {/* Rating */}
          <div>
            <h3 className="mb-3 font-semibold text-[var(--text-primary)]">Calificación Mínima</h3>
            <div className="flex gap-2">
              {[4, 3, 2, 1].map((rating) => (
                <button
                  key={rating}
                  onClick={() =>
                    updateFilter('min_rating', filters.min_rating === rating ? undefined : rating)
                  }
                  className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                    filters.min_rating === rating
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  <Star
                    className={`h-4 w-4 ${filters.min_rating === rating ? 'fill-current' : ''}`}
                  />
                  {rating}+
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-[var(--border-default)] bg-white p-4">
          <button
            onClick={onClearFilters}
            className="flex-1 rounded-lg border border-[var(--border-default)] px-4 py-3 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            Limpiar
          </button>
          <button
            onClick={handleApplyAndClose}
            className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-3 font-medium text-white transition-opacity hover:opacity-90"
          >
            Ver {resultCount} productos
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
