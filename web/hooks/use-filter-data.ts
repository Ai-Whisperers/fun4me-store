import { useState, useEffect } from 'react'
import { logger } from '@/lib/utils/logger'

export interface FilterOption {
  id: string
  name: string
  slug: string
  count?: number
}

export interface Brand extends FilterOption {
  logo_url?: string
}

export interface Category extends FilterOption {}

export interface UseFilterDataResult {
  categories: Category[]
  brands: Brand[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useFilterData(clinic: string): UseFilterDataResult {
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFilters = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [categoriesRes, brandsRes] = await Promise.all([
        fetch(`/api/store/categories?clinic=${clinic}&include_counts=true`),
        fetch(`/api/store/brands?clinic=${clinic}&include_counts=true`),
      ])

      if (!categoriesRes.ok || !brandsRes.ok) {
        throw new Error('Failed to fetch filter data')
      }

      const [categoriesData, brandsData] = await Promise.all([
        categoriesRes.json(),
        brandsRes.json(),
      ])

      setCategories(categoriesData.categories || [])
      setBrands(brandsData.brands || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      logger.error('Error fetching filters:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFilters()
  }, [clinic])

  return {
    categories,
    brands,
    isLoading,
    error,
    refetch: fetchFilters,
  }
}
