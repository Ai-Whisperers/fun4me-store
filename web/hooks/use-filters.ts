'use client'

import { useState, useMemo, useCallback } from 'react'

/**
 * Configuration for a single filter field
 */
export interface FilterConfig<T = unknown> {
  /** Unique key for this filter */
  key: string
  /** Label displayed in UI */
  label: string
  /** Type of filter */
  type: 'select' | 'text' | 'date' | 'dateRange' | 'boolean'
  /** Available options for select type */
  options?: { value: string; label: string }[]
  /** Default value */
  defaultValue?: string
  /** Custom filter function - if not provided, uses simple equality check */
  filterFn?: (item: T, value: string) => boolean
}

/**
 * Date range value type
 */
export interface DateRange {
  start: Date | null
  end: Date | null
}

/**
 * Options for useFilters hook
 */
export interface UseFiltersOptions<T> {
  /** Initial filter values */
  initialFilters?: Record<string, string>
  /** Initial sort configuration */
  initialSort?: {
    key: string
    order: 'asc' | 'desc'
  }
  /** Custom sort function */
  sortFn?: (a: T, b: T, key: string, order: 'asc' | 'desc') => number
}

/**
 * Return type for useFilters hook
 */
export interface UseFiltersReturn<T> {
  /** Filtered and sorted items */
  filteredItems: T[]
  /** Current filter values */
  filters: Record<string, string>
  /** Set a single filter value */
  setFilter: (key: string, value: string) => void
  /** Set multiple filter values at once */
  setFilters: (filters: Record<string, string>) => void
  /** Clear all filters */
  clearFilters: () => void
  /** Clear a specific filter */
  clearFilter: (key: string) => void
  /** Current sort key */
  sortBy: string | null
  /** Set sort key */
  setSortBy: (key: string | null) => void
  /** Current sort order */
  sortOrder: 'asc' | 'desc'
  /** Set sort order */
  setSortOrder: (order: 'asc' | 'desc') => void
  /** Toggle sort order */
  toggleSortOrder: () => void
  /** Check if any filters are active */
  hasActiveFilters: boolean
  /** Count of active filters */
  activeFilterCount: number
}

/**
 * Custom hook to handle filtering and sorting of data arrays.
 * Eliminates repetitive filter/sort logic across components.
 *
 * @example
 * ```tsx
 * const filterConfigs: FilterConfig<Pet>[] = [
 *   {
 *     key: 'species',
 *     label: 'Especie',
 *     type: 'select',
 *     options: [
 *       { value: 'all', label: 'Todas' },
 *       { value: 'dog', label: 'Perros' },
 *       { value: 'cat', label: 'Gatos' },
 *     ],
 *   },
 *   {
 *     key: 'status',
 *     label: 'Estado',
 *     type: 'select',
 *     options: [
 *       { value: 'all', label: 'Todos' },
 *       { value: 'active', label: 'Activos' },
 *     ],
 *   },
 * ];
 *
 * const {
 *   filteredItems,
 *   filters,
 *   setFilter,
 *   clearFilters,
 *   sortBy,
 *   setSortBy,
 *   sortOrder,
 *   toggleSortOrder,
 * } = useFilters(pets, filterConfigs);
 *
 * // In JSX
 * <select
 *   value={filters.species || 'all'}
 *   onChange={(e) => setFilter('species', e.target.value)}
 * >
 *   {filterConfigs[0].options?.map((opt) => (
 *     <option key={opt.value} value={opt.value}>{opt.label}</option>
 *   ))}
 * </select>
 * ```
 */
export function useFilters<T extends Record<string, unknown>>(
  items: T[],
  filterConfigs: FilterConfig<T>[],
  options: UseFiltersOptions<T> = {}
): UseFiltersReturn<T> {
  const { initialFilters = {}, initialSort, sortFn } = options

  // Initialize filters with defaults from configs
  const defaultFilters = useMemo(() => {
    const defaults: Record<string, string> = {}
    for (const config of filterConfigs) {
      if (config.defaultValue) {
        defaults[config.key] = config.defaultValue
      }
    }
    return { ...defaults, ...initialFilters }
  }, [filterConfigs, initialFilters])

  const [filters, setFiltersState] = useState<Record<string, string>>(defaultFilters)
  const [sortBy, setSortBy] = useState<string | null>(initialSort?.key ?? null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSort?.order ?? 'asc')

  // Set a single filter
  const setFilter = useCallback((key: string, value: string) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Set multiple filters at once
  const setFilters = useCallback((newFilters: Record<string, string>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters)
  }, [defaultFilters])

  // Clear a specific filter
  const clearFilter = useCallback(
    (key: string) => {
      setFiltersState((prev) => {
        const newFilters = { ...prev }
        delete newFilters[key]
        // Restore default if exists
        const config = filterConfigs.find((c) => c.key === key)
        if (config?.defaultValue) {
          newFilters[key] = config.defaultValue
        }
        return newFilters
      })
    },
    [filterConfigs]
  )

  // Toggle sort order
  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }, [])

  // Default sort function
  const defaultSortFn = useCallback((a: T, b: T, key: string, order: 'asc' | 'desc'): number => {
    const aVal = a[key]
    const bVal = b[key]

    // Handle null/undefined
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return order === 'asc' ? 1 : -1
    if (bVal == null) return order === 'asc' ? -1 : 1

    // Handle dates
    if (aVal instanceof Date && bVal instanceof Date) {
      return order === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime()
    }

    // Handle strings
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const comparison = aVal.localeCompare(bVal, 'es', { sensitivity: 'base' })
      return order === 'asc' ? comparison : -comparison
    }

    // Handle numbers
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return order === 'asc' ? aVal - bVal : bVal - aVal
    }

    // Fallback to string comparison
    const aStr = String(aVal)
    const bStr = String(bVal)
    const comparison = aStr.localeCompare(bStr, 'es', { sensitivity: 'base' })
    return order === 'asc' ? comparison : -comparison
  }, [])

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...items]

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (!value || value === 'all' || value === '') continue

      const config = filterConfigs.find((c) => c.key === key)

      if (config?.filterFn) {
        // Use custom filter function (config exists due to optional chaining check)
        const filterFn = config.filterFn
        result = result.filter((item) => filterFn(item, value))
      } else {
        // Default: simple equality check
        result = result.filter((item) => {
          const itemValue = item[key]
          if (itemValue == null) return false

          // Handle boolean filters
          if (config?.type === 'boolean') {
            return String(itemValue) === value
          }

          // Handle text search (case-insensitive contains)
          if (config?.type === 'text') {
            return String(itemValue).toLowerCase().includes(value.toLowerCase())
          }

          // Default equality
          return String(itemValue) === value
        })
      }
    }

    // Apply sorting
    if (sortBy) {
      const sorter = sortFn ?? defaultSortFn
      result.sort((a, b) => sorter(a, b, sortBy, sortOrder))
    }

    return result
  }, [items, filters, filterConfigs, sortBy, sortOrder, sortFn, defaultSortFn])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(
      ([key, value]) => value && value !== 'all' && value !== '' && value !== defaultFilters[key]
    ).length
  }, [filters, defaultFilters])

  const hasActiveFilters = activeFilterCount > 0

  return {
    filteredItems,
    filters,
    setFilter,
    setFilters,
    clearFilters,
    clearFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    toggleSortOrder,
    hasActiveFilters,
    activeFilterCount,
  }
}

/**
 * Utility to create filter options from an array of items
 *
 * @example
 * ```tsx
 * const speciesOptions = createFilterOptions(
 *   pets,
 *   'species',
 *   { all: 'Todas las especies' }
 * );
 * // Returns: [{ value: 'all', label: 'Todas las especies' }, { value: 'dog', label: 'Dog' }, ...]
 * ```
 */
export function createFilterOptions<T extends Record<string, unknown>>(
  items: T[],
  key: keyof T,
  allOption?: { value: string; label: string }
): { value: string; label: string }[] {
  const uniqueValues = [...new Set(items.map((item) => item[key]).filter(Boolean))]
  const options = uniqueValues.map((val) => ({
    value: String(val),
    label: String(val),
  }))

  if (allOption) {
    return [{ value: allOption.value, label: allOption.label }, ...options]
  }

  return options
}
