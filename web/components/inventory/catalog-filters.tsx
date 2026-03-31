import { Filter } from 'lucide-react'
import { FilterSection, ActiveFilters } from '@/components/shared'
import { useFilterData } from '@/hooks/use-filter-data'
import { useExpandableSections } from '@/hooks/use-expandable-sections'

interface Category {
  id: string
  name: string
  slug: string
  count?: number
}

interface Brand {
  id: string
  name: string
  slug: string
  logo_url?: string
  count?: number
}

interface CatalogFiltersProps {
  readonly clinic: string
  readonly selectedCategory: string
  readonly selectedBrand: string
  readonly onCategoryChange: (category: string) => void
  readonly onBrandChange: (brand: string) => void
}

export default function CatalogFilters({
  clinic,
  selectedCategory,
  selectedBrand,
  onCategoryChange,
  onBrandChange,
}: CatalogFiltersProps) {
  const { categories, brands, isLoading, error } = useFilterData(clinic)
  const { expandedSections, toggleSection } = useExpandableSections({
    categories: true,
    brands: true,
  })

  const clearFilters = () => {
    onCategoryChange('all')
    onBrandChange('all')
  }

  const hasActiveFilters = selectedCategory !== 'all' || selectedBrand !== 'all'

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="text-center text-red-600">
          <Filter className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="font-medium">Error al cargar filtros</p>
          <p className="text-sm opacity-75">Inténtalo de nuevo más tarde</p>
        </div>
      </div>
    )
  }

  return (
    <div className="sticky top-6 rounded-3xl border border-gray-100 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
              <Filter className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900">Filtros</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 underline hover:text-gray-700"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6 p-6">
        <FilterSection
          title="Categorías"
          options={categories}
          selectedValue={selectedCategory}
          onChange={onCategoryChange}
          isExpanded={expandedSections.categories}
          onToggle={() => toggleSection('categories')}
          isLoading={isLoading}
          renderOption={(category: Category) => category.name}
          showCounts={true}
        />

        <FilterSection
          title="Marcas"
          options={brands}
          selectedValue={selectedBrand}
          onChange={onBrandChange}
          isExpanded={expandedSections.brands}
          onToggle={() => toggleSection('brands')}
          isLoading={isLoading}
          renderOption={(brand: Brand) => (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {brand.logo_url && (
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="h-4 w-4 flex-shrink-0 object-contain"
                />
              )}
              <span className="truncate text-sm">{brand.name}</span>
            </div>
          )}
          showCounts={true}
        />

        {hasActiveFilters && (
          <ActiveFilters
            selectedCategory={selectedCategory}
            selectedBrand={selectedBrand}
            categories={categories}
            brands={brands}
            onCategoryChange={onCategoryChange}
            onBrandChange={onBrandChange}
          />
        )}
      </div>
    </div>
  )
}
