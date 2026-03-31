import React from 'react'
import { X } from 'lucide-react'
import { Category, Brand } from '@/hooks/use-filter-data'

interface ActiveFiltersProps {
  selectedCategory: string
  selectedBrand: string
  categories: Category[]
  brands: Brand[]
  onCategoryChange: (category: string) => void
  onBrandChange: (brand: string) => void
}

export function ActiveFilters({
  selectedCategory,
  selectedBrand,
  categories,
  brands,
  onCategoryChange,
  onBrandChange,
}: ActiveFiltersProps) {
  const activeFilters = []

  if (selectedCategory !== 'all') {
    const category = categories.find((c) => c.slug === selectedCategory)
    if (category) {
      activeFilters.push({
        type: 'category' as const,
        label: `Categoría: ${category.name}`,
        onRemove: () => onCategoryChange('all'),
        color: 'blue',
      })
    }
  }

  if (selectedBrand !== 'all') {
    const brand = brands.find((b) => b.slug === selectedBrand)
    if (brand) {
      activeFilters.push({
        type: 'brand' as const,
        label: `Marca: ${brand.name}`,
        onRemove: () => onBrandChange('all'),
        color: 'green',
      })
    }
  }

  if (activeFilters.length === 0) {
    return null
  }

  return (
    <div className="border-t border-gray-50 pt-4">
      <h4 className="mb-3 font-bold text-gray-900">Filtros Activos</h4>
      <div className="flex flex-wrap gap-2">
        {activeFilters.map((filter) => (
          <span
            key={filter.type}
            className={`inline-flex items-center gap-1 px-3 py-1 bg-${filter.color}-50 text-${filter.color}-700 rounded-full text-xs font-bold`}
          >
            {filter.label}
            <button
              onClick={filter.onRemove}
              className={`ml-1 hover:bg-${filter.color}-100 rounded-full p-0.5 transition-colors`}
              aria-label={`Remover filtro de ${filter.type}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
