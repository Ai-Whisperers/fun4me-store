'use client'

/**
 * Inventory Data Hook
 *
 * REF-006: Data fetching and state management extracted from client component
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import type { SortField, SortDirection } from '@/components/dashboard/inventory'
import type {
  Product,
  Category,
  PaginationInfo,
  InventoryStats,
  InventoryAlerts,
  ProductSource,
} from '../types'

interface UseInventoryDataProps {
  clinic: string
  initialLimit?: number
}

interface UseInventoryDataReturn {
  // Data
  products: Product[]
  categories: Category[]
  stats: InventoryStats | null
  alerts: InventoryAlerts | null
  sourceSummary: { own?: number; catalog?: number }
  pagination: PaginationInfo
  isLoadingProducts: boolean

  // Filters
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  stockFilter: string
  setStockFilter: (filter: string) => void
  sourceFilter: ProductSource
  setSourceFilter: (filter: ProductSource) => void

  // Sorting
  sortField: SortField
  sortDirection: SortDirection
  toggleSort: (field: SortField) => void

  // Derived
  filteredAndSortedProducts: Product[]
  activeFilterCount: number

  // Actions
  fetchProducts: (query?: string, page?: number, limit?: number) => Promise<void>
  fetchStats: () => Promise<void>
  fetchAlerts: () => Promise<void>
  handlePageChange: (page: number) => void
  handleLimitChange: (limit: number) => void
  clearFilters: () => void
}

export function useInventoryData({
  clinic,
  initialLimit = 25,
}: UseInventoryDataProps): UseInventoryDataReturn {
  // Data State
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [alerts, setAlerts] = useState<InventoryAlerts | null>(null)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [sourceSummary, setSourceSummary] = useState<{ own?: number; catalog?: number }>({})

  // Filter/Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<ProductSource>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Pagination State
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: initialLimit,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false,
  })

  // Fetch Functions
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error al cargar estadísticas', e)
      }
    }
  }, [])

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/alerts')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data)
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error al cargar alertas', e)
      }
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`/api/store/categories?clinic=${clinic}`)
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error al cargar categorías', e)
      }
    }
  }, [clinic])

  const fetchProducts = useCallback(
    async (query = '', page = 1, limit = pagination.limit) => {
      setIsLoadingProducts(true)
      try {
        let url = `/api/dashboard/inventory?clinic=${clinic}&search=${encodeURIComponent(query)}&page=${page}&limit=${limit}&source=${sourceFilter}`

        if (selectedCategory !== 'all') {
          url += `&category=${selectedCategory}`
        }

        if (stockFilter !== 'all') {
          url += `&stock_status=${stockFilter}`
        }

        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setProducts(data.products || [])
          if (data.pagination) {
            setPagination(data.pagination)
          }
          if (data.summary) {
            setSourceSummary(data.summary)
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error al cargar productos', e)
        }
      } finally {
        setIsLoadingProducts(false)
      }
    },
    [clinic, selectedCategory, stockFilter, sourceFilter, pagination.limit]
  )

  // Initial data load
  useEffect(() => {
    fetchStats()
    fetchCategories()
    fetchProducts()
    fetchAlerts()
  }, [clinic])

  // Refetch when filters change
  useEffect(() => {
    fetchProducts(searchQuery, 1, pagination.limit)
  }, [selectedCategory, stockFilter, sourceFilter])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(searchQuery, 1, pagination.limit)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Local filtering and sorting
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products]

    // Local stock filtering (server may not filter these correctly)
    if (stockFilter === 'low_stock') {
      filtered = filtered.filter(
        (p) =>
          (p.inventory?.stock_quantity || 0) > 0 &&
          (p.inventory?.stock_quantity || 0) <= (p.inventory?.min_stock_level || 5)
      )
    } else if (stockFilter === 'out_of_stock') {
      filtered = filtered.filter((p) => (p.inventory?.stock_quantity || 0) === 0)
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'es')
          break
        case 'sku':
          comparison = (a.sku || '').localeCompare(b.sku || '')
          break
        case 'base_price':
          comparison = (a.base_price || 0) - (b.base_price || 0)
          break
        case 'stock':
          comparison = (a.inventory?.stock_quantity || 0) - (b.inventory?.stock_quantity || 0)
          break
        case 'category':
          comparison = (a.category?.name || '').localeCompare(b.category?.name || '', 'es')
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [products, stockFilter, sortField, sortDirection])

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery) count++
    if (selectedCategory !== 'all') count++
    if (stockFilter !== 'all') count++
    if (sourceFilter !== 'all') count++
    return count
  }, [searchQuery, selectedCategory, stockFilter, sourceFilter])

  // Handlers
  const handlePageChange = (newPage: number) => {
    fetchProducts(searchQuery, newPage, pagination.limit)
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit }))
    fetchProducts(searchQuery, 1, newLimit)
  }

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedCategory('all')
    setStockFilter('all')
    setSourceFilter('all')
  }, [])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  return {
    products,
    categories,
    stats,
    alerts,
    sourceSummary,
    pagination,
    isLoadingProducts,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    stockFilter,
    setStockFilter,
    sourceFilter,
    setSourceFilter,
    sortField,
    sortDirection,
    toggleSort,
    filteredAndSortedProducts,
    activeFilterCount,
    fetchProducts,
    fetchStats,
    fetchAlerts,
    handlePageChange,
    handleLimitChange,
    clearFilters,
  }
}
