'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react'
import type { PetSizeCategory } from '@/lib/utils/pet-size'

export type CartItemType = 'service' | 'product'

// Sync status for database persistence
export type CartSyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

// Stock validation result
export interface StockValidationResult {
  success: boolean
  limitedByStock: boolean
  requestedQuantity: number
  actualQuantity: number
  availableStock?: number
  message?: string
}

export interface CartItem {
  id: string
  name: string
  price: number
  type: CartItemType
  quantity: number
  image_url?: string
  description?: string
  stock?: number // Available stock for validation

  // Product-specific fields (optional)
  sku?: string
  variant_id?: string
  requires_prescription?: boolean
  prescription_file?: string // URL or ID of the uploaded prescription

  // Service-specific fields (optional)
  pet_id?: string
  pet_name?: string
  pet_size?: PetSizeCategory
  service_id?: string
  service_icon?: string // Icon name for service (e.g., "stethoscope", "syringe")
  variant_name?: string
  base_price?: number
}

// (Removed AddToCartButtonProps interface; it belongs in its own component file)

/**
 * Generates a unique cart item ID
 * For services with pets: service_id-pet_id-variant_name
 * For products: product-id
 */
export function generateCartItemId(
  item: Omit<CartItem, 'quantity' | 'id'> & { id?: string }
): string {
  if (item.type === 'service' && item.pet_id && item.service_id) {
    return `${item.service_id}-${item.pet_id}-${item.variant_name || 'default'}`
  }
  return item.id || `unknown-${Date.now()}`
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => StockValidationResult
  updateQuantity: (id: string, delta: number) => StockValidationResult
  removeItem: (id: string) => void
  clearCart: () => void
  total: number
  itemCount: number
  discount: number
  setDiscount: (value: number) => void
  // Database sync
  syncStatus: CartSyncStatus
  syncError: string | null
  isLoggedIn: boolean
  syncToDatabase: () => Promise<void>
  loadFromDatabase: () => Promise<void>
  // Stock validation helpers
  getStockStatus: (
    itemId: string
  ) => { atLimit: boolean; nearLimit: boolean; available: number } | null
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { readonly children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)

  // Database sync state
  const [syncStatus, setSyncStatus] = useState<CartSyncStatus>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // BUG-012: Ref for latest items to avoid stale closure in debounced sync
  const itemsRef = useRef(items)

  // BUG-012: Keep itemsRef in sync with items state
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // Load cart from local storage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('vete_cart')
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart))
      } catch (e: unknown) {
        console.error('Failed to parse cart', e)
      }
    }
    setIsInitialized(true)

    // Check if user is logged in and try to load from database
    checkAuthAndLoad()
  }, [])

  // Check authentication status and load cart from database
  const checkAuthAndLoad = async () => {
    // Quick check: if no Supabase auth cookie exists, skip API call
    const hasAuthCookie = document.cookie.includes('sb-') && document.cookie.includes('-auth-token')
    if (!hasAuthCookie) {
      setIsLoggedIn(false)
      return
    }

    try {
      const response = await fetch('/api/store/cart')
      if (response.ok) {
        const data = await response.json()

        // Check authentication status from response
        const isAuthenticated = data.authenticated !== false
        setIsLoggedIn(isAuthenticated)

        if (isAuthenticated && data.items && Array.isArray(data.items) && data.items.length > 0) {
          // Merge with local storage
          const localCart = localStorage.getItem('vete_cart')
          const localItems = localCart ? JSON.parse(localCart) : []

          if (localItems.length > 0) {
            // Merge: prefer higher quantities
            const mergedMap = new Map<string, CartItem>()
            for (const item of data.items) {
              mergedMap.set(item.id, item)
            }
            for (const item of localItems) {
              const existing = mergedMap.get(item.id)
              if (existing) {
                existing.quantity = Math.max(existing.quantity, item.quantity)
              } else {
                mergedMap.set(item.id, item)
              }
            }
            setItems(Array.from(mergedMap.values()))
          } else {
            setItems(data.items)
          }
        }
      } else {
        setIsLoggedIn(false)
      }
    } catch (error: unknown) {
      console.error('Error checking auth:', error)
      setIsLoggedIn(false)
    }
  }

  // Save cart to local storage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('vete_cart', JSON.stringify(items))

      // Debounced sync to database for logged-in users
      if (isLoggedIn) {
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current)
        }
        syncTimeoutRef.current = setTimeout(() => {
          syncToDatabase()
        }, 500) // 500ms debounce
      }
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [items, isInitialized, isLoggedIn])

  // Sync cart to database
  // BUG-012: Uses itemsRef to always get latest items, avoiding stale closure
  const syncToDatabase = useCallback(async () => {
    if (!isLoggedIn) return

    setSyncStatus('syncing')
    setSyncError(null)

    try {
      // BUG-012: Read from ref to get latest items, not closure
      const currentItems = itemsRef.current
      const response = await fetch('/api/store/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: currentItems }),
      })

      if (response.ok) {
        setSyncStatus('synced')
      } else {
        const data = await response.json()
        setSyncError(data.error || 'Error al sincronizar')
        setSyncStatus('error')
      }
    } catch (error: unknown) {
      console.error('Error syncing cart:', error)
      setSyncError('Error de conexión')
      setSyncStatus('error')
    }
  }, [isLoggedIn]) // BUG-012: Removed items from deps - using ref instead

  // Load cart from database
  const loadFromDatabase = useCallback(async () => {
    setSyncStatus('syncing')
    setSyncError(null)

    try {
      const response = await fetch('/api/store/cart')
      if (response.ok) {
        const data = await response.json()
        setIsLoggedIn(true)
        if (data.items && Array.isArray(data.items)) {
          setItems(data.items)
        }
        setSyncStatus('synced')
      } else if (response.status === 401) {
        setIsLoggedIn(false)
        setSyncStatus('idle')
      } else {
        const data = await response.json()
        setSyncError(data.error || 'Error al cargar')
        setSyncStatus('error')
      }
    } catch (error: unknown) {
      console.error('Error loading cart:', error)
      setSyncError('Error de conexión')
      setSyncStatus('error')
    }
  }, [])

  const addItem = useCallback(
    (newItem: Omit<CartItem, 'quantity'>, quantity: number = 1): StockValidationResult => {
      // Generate unique ID for the item
      const itemId = generateCartItemId(newItem)

      // Get current state synchronously to calculate result
      let result: StockValidationResult = {
        success: true,
        limitedByStock: false,
        requestedQuantity: quantity,
        actualQuantity: quantity,
        availableStock: newItem.stock,
      }

      setItems((prev) => {
        const itemWithId = { ...newItem, id: itemId }
        const existing = prev.find((i) => i.id === itemId)
        const existingQty = existing?.quantity ?? 0
        const maxStock = newItem.stock ?? Infinity

        // Stock validation for products
        if (newItem.type === 'product' && newItem.stock !== undefined) {
          const desiredTotal = existingQty + quantity

          if (desiredTotal > maxStock) {
            // Calculate how many we can actually add
            const canAdd = Math.max(0, maxStock - existingQty)
            const actualTotal = existingQty + canAdd

            result = {
              success: canAdd > 0,
              limitedByStock: true,
              requestedQuantity: quantity,
              actualQuantity: canAdd,
              availableStock: maxStock,
              message:
                canAdd === 0
                  ? `Stock insuficiente. Ya tienes ${existingQty} de ${maxStock} disponibles.`
                  : `Solo hay ${maxStock} unidades disponibles. Se agregaron ${canAdd} unidades.`,
            }

            if (canAdd === 0) {
              return prev // No change
            }

            if (existing) {
              return prev.map((i) =>
                i.id === itemId ? { ...i, quantity: actualTotal, stock: maxStock } : i
              )
            }
            return [...prev, { ...itemWithId, quantity: canAdd }]
          }
        }

        // Normal addition (no stock limit reached)
        if (existing) {
          return prev.map((i) => (i.id === itemId ? { ...i, quantity: i.quantity + quantity } : i))
        }

        return [...prev, { ...itemWithId, quantity }]
      })

      return result
    },
    []
  )

  const updateQuantity = useCallback((id: string, delta: number): StockValidationResult => {
    let result: StockValidationResult = {
      success: true,
      limitedByStock: false,
      requestedQuantity: delta,
      actualQuantity: delta,
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.id === id)
      if (!existing) {
        result = {
          success: false,
          limitedByStock: false,
          requestedQuantity: delta,
          actualQuantity: 0,
          message: 'Producto no encontrado en el carrito',
        }
        return prev
      }

      const newQuantity = existing.quantity + delta
      result.availableStock = existing.stock

      // Remove if quantity <= 0
      if (newQuantity <= 0) {
        result.actualQuantity = -existing.quantity
        return prev.filter((i) => i.id !== id)
      }

      // Stock validation for products
      if (
        existing.type === 'product' &&
        existing.stock !== undefined &&
        newQuantity > existing.stock
      ) {
        const cappedQuantity = existing.stock
        const actualDelta = cappedQuantity - existing.quantity

        result = {
          success: actualDelta > 0,
          limitedByStock: true,
          requestedQuantity: delta,
          actualQuantity: actualDelta,
          availableStock: existing.stock,
          message: `Solo hay ${existing.stock} unidades disponibles`,
        }

        if (actualDelta === 0) {
          return prev // Already at max stock
        }

        return prev.map((i) => (i.id === id ? { ...i, quantity: cappedQuantity } : i))
      }

      // Normal update
      return prev.map((i) => (i.id === id ? { ...i, quantity: newQuantity } : i))
    })

    return result
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  // Helper to get stock status for an item
  const getStockStatus = useCallback(
    (itemId: string): { atLimit: boolean; nearLimit: boolean; available: number } | null => {
      const item = items.find((i) => i.id === itemId)
      if (!item || item.type !== 'product' || item.stock === undefined) {
        return null
      }

      const remaining = item.stock - item.quantity
      const nearLimitThreshold = Math.ceil(item.stock * 0.2) // 20% threshold

      return {
        atLimit: item.quantity >= item.stock,
        nearLimit: remaining <= nearLimitThreshold && remaining > 0,
        available: remaining,
      }
    },
    [items]
  )

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const contextValue = useMemo(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      total,
      itemCount,
      discount,
      setDiscount,
      syncStatus,
      syncError,
      isLoggedIn,
      syncToDatabase,
      loadFromDatabase,
      getStockStatus,
    }),
    [
      items,
      total,
      itemCount,
      discount,
      syncStatus,
      syncError,
      isLoggedIn,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      syncToDatabase,
      loadFromDatabase,
      getStockStatus,
    ]
  )

  return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
