/**
 * Inventory Query Hooks
 *
 * RES-001: React Query Migration
 *
 * Example hooks demonstrating the migration pattern from useEffect+fetch
 * to TanStack React Query.
 *
 * Usage:
 * ```typescript
 * import { useInventoryList, useInventoryStats } from '@/lib/queries/inventory'
 *
 * function InventoryPage({ clinic }: { clinic: string }) {
 *   const { data: products, isLoading } = useInventoryList(clinic)
 *   const { data: stats } = useInventoryStats(clinic)
 *
 *   if (isLoading) return <LoadingSpinner />
 *   return <ProductTable products={products} />
 * }
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './keys'
import { buildUrl, staleTimes, gcTimes, parseErrorResponse } from './utils'

// Types
export interface InventoryProduct {
  id: string
  tenant_id: string
  sku: string | null
  name: string
  description: string | null
  category_id: string | null
  brand: string | null
  base_price: number
  cost_price: number | null
  stock_quantity: number
  reorder_point: number | null
  barcode: string | null
  is_active: boolean
  is_prescription_required: boolean
  created_at: string
  updated_at: string
  category_name?: string
  weighted_average_cost?: number
}

export interface InventoryStats {
  totalProducts: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
  expiringCount: number
}

export interface InventoryFilters {
  search?: string
  category?: string
  stockFilter?: 'all' | 'low' | 'out' | 'in_stock'
  source?: 'all' | 'own' | 'catalog'
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Query Hooks

/**
 * Fetch inventory products list
 *
 * Replaces the pattern:
 * ```typescript
 * useEffect(() => {
 *   fetch(`/api/${clinic}/inventory?...`)
 *     .then(r => r.json())
 *     .then(setProducts)
 * }, [clinic, filters])
 * ```
 */
export function useInventoryList(
  clinic: string,
  filters?: InventoryFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.inventory.list(clinic, filters as Record<string, unknown>),
    queryFn: async (): Promise<PaginatedResponse<InventoryProduct>> => {
      const url = buildUrl(`/api/${clinic}/inventory`, {
        search: filters?.search,
        category: filters?.category,
        stock_filter: filters?.stockFilter,
        source: filters?.source,
        page: filters?.page,
        limit: filters?.limit,
      })

      const response = await fetch(url)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'inventory')
        throw new Error(error.error || 'Error al cargar inventario')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.SHORT, // Inventory changes frequently
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch inventory statistics
 */
export function useInventoryStats(clinic: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.inventory.stats(clinic),
    queryFn: async (): Promise<InventoryStats> => {
      const response = await fetch(`/api/${clinic}/inventory/stats`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'inventory')
        throw new Error(error.error || 'Error al cargar estadísticas')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch low stock alerts
 */
export function useInventoryAlerts(clinic: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.inventory.alerts(clinic),
    queryFn: async () => {
      const response = await fetch(`/api/${clinic}/inventory/alerts`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'inventory')
        throw new Error(error.error || 'Error al cargar alertas')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch inventory categories
 */
export function useInventoryCategories(clinic: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.inventory.categories(clinic),
    queryFn: async (): Promise<{ id: string; name: string; slug: string }[]> => {
      const response = await fetch(`/api/${clinic}/store/categories`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'inventory')
        throw new Error(error.error || 'Error al cargar categorías')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.LONG, // Categories change rarely
    gcTime: gcTimes.LONG,
  })
}

/**
 * Fetch single product details
 */
export function useInventoryProduct(
  productId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.inventory.detail(productId),
    queryFn: async (): Promise<InventoryProduct> => {
      const response = await fetch(`/api/inventory/${productId}`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'inventory')
        throw new Error(error.error || 'Error al cargar producto')
      }
      return response.json()
    },
    enabled: (options?.enabled ?? true) && !!productId,
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })
}

// Mutation Hooks

interface CreateProductInput {
  name: string
  sku?: string
  category_id?: string
  base_price: number
  cost_price?: number
  stock_quantity?: number
  reorder_point?: number
  barcode?: string
  is_prescription_required?: boolean
}

/**
 * Create a new inventory product
 */
export function useCreateProduct(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProductInput): Promise<InventoryProduct> => {
      const response = await fetch(`/api/${clinic}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'inventory')
        throw new Error(error.error || 'Error al crear producto')
      }
      return response.json()
    },
    onSuccess: () => {
      // Invalidate all inventory queries for this clinic
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
    },
  })
}

interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string
}

/**
 * Update an inventory product
 */
export function useUpdateProduct(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateProductInput): Promise<InventoryProduct> => {
      const response = await fetch(`/api/${clinic}/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'inventory')
        throw new Error(error.error || 'Error al actualizar producto')
      }
      return response.json()
    },
    onSuccess: (data) => {
      // Invalidate list queries and update the specific product cache
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      queryClient.setQueryData(queryKeys.inventory.detail(data.id), data)
    },
  })
}

/**
 * Delete an inventory product
 */
export function useDeleteProduct(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (productId: string): Promise<void> => {
      const response = await fetch(`/api/${clinic}/inventory/${productId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'inventory')
        throw new Error(error.error || 'Error al eliminar producto')
      }
    },
    onSuccess: (_, productId) => {
      // Invalidate list queries and remove the specific product from cache
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      queryClient.removeQueries({ queryKey: queryKeys.inventory.detail(productId) })
    },
  })
}

interface StockAdjustmentInput {
  productId: string
  quantity: number
  type: 'adjustment' | 'receiving' | 'sale' | 'damage' | 'expired' | 'theft' | 'correction'
  notes?: string
  unit_cost?: number
}

/**
 * Adjust stock for a product
 */
export function useStockAdjustment(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ productId, ...input }: StockAdjustmentInput): Promise<void> => {
      const response = await fetch(`/api/${clinic}/inventory/${productId}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'inventory')
        throw new Error(error.error || 'Error al ajustar stock')
      }
    },
    onSuccess: (_, { productId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.list(clinic) })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.stats(clinic) })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.alerts(clinic) })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.detail(productId) })
    },
  })
}
