/**
 * Store Query Hooks
 *
 * RES-001: React Query Migration - Phase 2
 *
 * Query hooks for store/e-commerce data fetching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './keys'
import { buildUrl, staleTimes, gcTimes, parseErrorResponse } from './utils'

// Types
export interface StoreProduct {
  id: string
  tenant_id: string
  sku: string | null
  name: string
  description: string | null
  category_id: string | null
  category_name?: string
  brand: string | null
  base_price: number
  sale_price?: number
  stock_quantity: number
  is_active: boolean
  is_prescription_required: boolean
  images: string[]
  created_at: string
}

export interface StoreCategory {
  id: string
  name: string
  slug: string
  parent_id: string | null
  product_count?: number
}

export interface CartItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  requires_prescription: boolean
  image_url?: string
}

export interface Cart {
  id: string
  tenant_id: string
  customer_id: string
  items: CartItem[]
  subtotal: number
  updated_at: string
}

export interface StoreOrder {
  id: string
  tenant_id: string
  customer_id: string
  customer_name?: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  total: number
  items_count: number
  requires_prescription_review: boolean
  created_at: string
}

export interface WishlistItem {
  id: string
  product_id: string
  product_name: string
  product_price: number
  product_image?: string
  in_stock: boolean
  created_at: string
}

export interface ProductFilters {
  search?: string
  category?: string
  brand?: string
  min_price?: number
  max_price?: number
  in_stock?: boolean
  page?: number
  limit?: number
}

// Query Hooks

/**
 * Fetch store products
 */
export function useStoreProducts(
  clinic: string,
  filters?: ProductFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.store.products(clinic, filters as Record<string, unknown>),
    queryFn: async (): Promise<{ products: StoreProduct[]; total: number }> => {
      const url = buildUrl(`/api/${clinic}/store/products`, {
        search: filters?.search,
        category: filters?.category,
        brand: filters?.brand,
        min_price: filters?.min_price,
        max_price: filters?.max_price,
        in_stock: filters?.in_stock,
        page: filters?.page,
        limit: filters?.limit,
      })
      const response = await fetch(url)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'store/products')
        throw new Error(error.error || 'Error al cargar productos')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch single product
 */
export function useStoreProduct(
  productId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.store.product(productId),
    queryFn: async (): Promise<StoreProduct> => {
      const response = await fetch(`/api/store/products/${productId}`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'store/product')
        throw new Error(error.error || 'Error al cargar producto')
      }
      return response.json()
    },
    enabled: (options?.enabled ?? true) && !!productId,
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch store categories
 */
export function useStoreCategories(clinic: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.store.categories(clinic),
    queryFn: async (): Promise<StoreCategory[]> => {
      const response = await fetch(`/api/${clinic}/store/categories`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'store/categories')
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
 * Fetch user's cart
 */
export function useCart(clinic: string, userId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.store.cart(clinic, userId),
    queryFn: async (): Promise<Cart | null> => {
      const response = await fetch(`/api/${clinic}/store/cart`)
      if (!response.ok) {
        if (response.status === 404) return null
        const error = await parseErrorResponse(response, 'store/cart')
        throw new Error(error.error || 'Error al cargar carrito')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.SHORT, // Cart can change quickly
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch store orders
 */
export function useStoreOrders(
  clinic: string,
  filters?: { status?: string; page?: number; limit?: number },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.store.orders(clinic, filters as Record<string, unknown>),
    queryFn: async (): Promise<{ orders: StoreOrder[]; total: number }> => {
      const url = buildUrl(`/api/${clinic}/store/orders`, filters)
      const response = await fetch(url)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'store/orders')
        throw new Error(error.error || 'Error al cargar pedidos')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch single order
 */
export function useStoreOrder(orderId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.store.order(orderId),
    queryFn: async (): Promise<StoreOrder & { items: CartItem[] }> => {
      const response = await fetch(`/api/store/orders/${orderId}`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'store/order')
        throw new Error(error.error || 'Error al cargar pedido')
      }
      return response.json()
    },
    enabled: (options?.enabled ?? true) && !!orderId,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch user's wishlist
 */
export function useWishlist(
  clinic: string,
  userId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.store.wishlist(clinic, userId),
    queryFn: async (): Promise<WishlistItem[]> => {
      const response = await fetch(`/api/${clinic}/store/wishlist`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'store/wishlist')
        throw new Error(error.error || 'Error al cargar lista de deseos')
      }
      return response.json()
    },
    enabled: (options?.enabled ?? true) && !!userId,
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })
}

// Mutation Hooks

/**
 * Add item to cart
 */
export function useAddToCart(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      product_id,
      quantity,
    }: {
      product_id: string
      quantity: number
    }): Promise<Cart> => {
      const response = await fetch(`/api/${clinic}/store/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id, quantity }),
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'store/add-to-cart')
        throw new Error(error.error || 'Error al agregar al carrito')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.store.cart(clinic), data)
    },
  })
}

/**
 * Update cart item quantity
 */
export function useUpdateCartItem(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      product_id,
      quantity,
    }: {
      product_id: string
      quantity: number
    }): Promise<Cart> => {
      const response = await fetch(`/api/${clinic}/store/cart/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id, quantity }),
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'store/update-cart')
        throw new Error(error.error || 'Error al actualizar carrito')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.store.cart(clinic), data)
    },
  })
}

/**
 * Remove item from cart
 */
export function useRemoveFromCart(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (product_id: string): Promise<Cart> => {
      const response = await fetch(`/api/${clinic}/store/cart/remove`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id }),
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'store/remove-from-cart')
        throw new Error(error.error || 'Error al remover del carrito')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.store.cart(clinic), data)
    },
  })
}

/**
 * Add to wishlist
 */
export function useAddToWishlist(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (product_id: string): Promise<void> => {
      const response = await fetch(`/api/${clinic}/store/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id }),
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'store/add-to-wishlist')
        throw new Error(error.error || 'Error al agregar a lista de deseos')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'wishlist'] })
    },
  })
}

/**
 * Remove from wishlist
 */
export function useRemoveFromWishlist(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (product_id: string): Promise<void> => {
      const response = await fetch(`/api/${clinic}/store/wishlist/${product_id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'store/remove-from-wishlist')
        throw new Error(error.error || 'Error al remover de lista de deseos')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'wishlist'] })
    },
  })
}
