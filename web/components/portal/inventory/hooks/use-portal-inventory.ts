'use client'

/**
 * Portal Inventory Data Fetching Hook
 *
 * Manages all data fetching for the inventory management page.
 */

import { useState, useEffect, useCallback } from 'react'
import type {
  Product,
  Category,
  InventoryStats,
  InventoryAlerts,
  PaginationInfo,
  StockFilterValue,
} from '../types'

interface UsePortalInventoryOptions {
  clinic: string
  searchQuery: string
  selectedCategory: string
  stockFilter: StockFilterValue
}

interface UsePortalInventoryResult {
  products: Product[]
  categories: Category[]
  stats: InventoryStats | null
  alerts: InventoryAlerts | null
  pagination: PaginationInfo
  isLoading: boolean
  fetchProducts: (query?: string, page?: number, limit?: number) => Promise<void>
  fetchStats: () => Promise<void>
  setItemsPerPage: (limit: number) => void
}

export function usePortalInventory({
  clinic,
  searchQuery,
  selectedCategory,
  stockFilter,
}: UsePortalInventoryOptions): UsePortalInventoryResult {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [alerts, setAlerts] = useState<InventoryAlerts | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false,
  })

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch inventory stats', e)
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
        console.error('Failed to fetch inventory alerts', e)
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
        console.error('Failed to fetch categories', e)
      }
    }
  }, [clinic])

  const fetchProducts = useCallback(
    async (query = searchQuery, page = 1, limit = pagination.limit) => {
      setIsLoading(true)
      try {
        let url = `/api/store/products?clinic=${clinic}&search=${query}&page=${page}&limit=${limit}`

        if (selectedCategory !== 'all') {
          url += `&category=${selectedCategory}`
        }

        if (stockFilter === 'in_stock') {
          url += '&in_stock_only=true'
        }

        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setProducts(data.products || [])
          if (data.pagination) {
            setPagination(data.pagination)
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch products', e)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [clinic, selectedCategory, stockFilter, searchQuery, pagination.limit]
  )

  const setItemsPerPage = useCallback((limit: number) => {
    setPagination((prev) => ({ ...prev, limit }))
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchStats()
    fetchCategories()
    fetchProducts()
    fetchAlerts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic])

  // Refetch when filters change
  useEffect(() => {
    fetchProducts(searchQuery, 1, pagination.limit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, stockFilter])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(searchQuery, 1, pagination.limit)
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  return {
    products,
    categories,
    stats,
    alerts,
    pagination,
    isLoading,
    fetchProducts,
    fetchStats,
    setItemsPerPage,
  }
}
