'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'

export type WishlistSyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

interface WishlistContextType {
  /** Product IDs in wishlist */
  items: string[]
  /** Loading state */
  isLoading: boolean
  /** Sync status */
  syncStatus: WishlistSyncStatus
  /** Error message if sync failed */
  syncError: string | null
  /** Check if a product is in wishlist */
  isWishlisted: (productId: string) => boolean
  /** Toggle wishlist status for a product */
  toggleWishlist: (productId: string) => Promise<void>
  /** Add a product to wishlist */
  addToWishlist: (productId: string) => Promise<void>
  /** Remove a product from wishlist */
  removeFromWishlist: (productId: string) => Promise<void>
  /** Clear entire wishlist */
  clearWishlist: () => void
  /** Total items in wishlist */
  itemCount: number
  /** Whether user is logged in */
  isLoggedIn: boolean
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

const LOCAL_STORAGE_KEY = 'vete_wishlist'

export function WishlistProvider({ children }: { readonly children: React.ReactNode }) {
  const [items, setItems] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<WishlistSyncStatus>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load wishlist on mount
  useEffect(() => {
    const loadWishlist = async () => {
      setIsLoading(true)

      // First, load from localStorage
      const savedWishlist = localStorage.getItem(LOCAL_STORAGE_KEY)
      let localItems: string[] = []
      if (savedWishlist) {
        try {
          localItems = JSON.parse(savedWishlist)
        } catch (e: unknown) {
          console.error('Failed to parse wishlist', e)
        }
      }

      // Quick check: if no Supabase auth cookie exists, skip API call
      const hasAuthCookie =
        document.cookie.includes('sb-') && document.cookie.includes('-auth-token')
      if (!hasAuthCookie) {
        setIsLoggedIn(false)
        setItems(localItems)
        setSyncStatus('idle')
        setIsLoading(false)
        setIsInitialized(true)
        return
      }

      // Try to load from database (if logged in)
      try {
        const response = await fetch('/api/store/wishlist')
        if (response.ok) {
          const data = await response.json()

          // Check authentication status from response
          const isAuthenticated = data.authenticated !== false
          setIsLoggedIn(isAuthenticated)

          if (isAuthenticated) {
            const serverItems: string[] = data.productIds ?? []

            // Merge local with server (union)
            if (localItems.length > 0 && serverItems.length > 0) {
              const merged = [...new Set([...serverItems, ...localItems])]
              setItems(merged)
              // Sync merged items to server
              await syncLocalToServer(localItems.filter((id) => !serverItems.includes(id)))
            } else if (serverItems.length > 0) {
              setItems(serverItems)
            } else {
              setItems(localItems)
            }
            setSyncStatus('synced')
          } else {
            // Not logged in, use local storage only
            setItems(localItems)
            setSyncStatus('idle')
          }
        } else {
          // Error response, use local storage
          setIsLoggedIn(false)
          setItems(localItems)
          setSyncStatus('idle')
        }
      } catch (error: unknown) {
        console.error('Error loading wishlist:', error)
        setItems(localItems)
        setSyncError('Error de conexión')
        setSyncStatus('error')
      } finally {
        setIsLoading(false)
        setIsInitialized(true)
      }
    }

    loadWishlist()
  }, [])

  // Sync local items to server
  const syncLocalToServer = async (newItems: string[]) => {
    for (const productId of newItems) {
      try {
        await fetch('/api/store/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        })
      } catch (e: unknown) {
        console.error('Failed to sync item to server:', e)
      }
    }
  }

  // Save to localStorage whenever items change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
    }
  }, [items, isInitialized])

  const isWishlisted = useCallback(
    (productId: string): boolean => {
      return items.includes(productId)
    },
    [items]
  )

  const addToWishlist = useCallback(
    async (productId: string): Promise<void> => {
      if (items.includes(productId)) return

      // Optimistically update
      setItems((prev) => [...prev, productId])

      // Sync to server if logged in
      if (isLoggedIn) {
        setSyncStatus('syncing')
        try {
          const response = await fetch('/api/store/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Error al agregar')
          }
          setSyncStatus('synced')
          setSyncError(null)
        } catch (error: unknown) {
          console.error('Error adding to wishlist:', error)
          setSyncError(error instanceof Error ? error.message : 'Error al agregar')
          setSyncStatus('error')
          // Rollback on error
          setItems((prev) => prev.filter((id) => id !== productId))
        }
      }
    },
    [items, isLoggedIn]
  )

  const removeFromWishlist = useCallback(
    async (productId: string): Promise<void> => {
      if (!items.includes(productId)) return

      // Optimistically update
      setItems((prev) => prev.filter((id) => id !== productId))

      // Sync to server if logged in
      if (isLoggedIn) {
        setSyncStatus('syncing')
        try {
          const response = await fetch(`/api/store/wishlist?productId=${productId}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Error al eliminar')
          }
          setSyncStatus('synced')
          setSyncError(null)
        } catch (error: unknown) {
          console.error('Error removing from wishlist:', error)
          setSyncError(error instanceof Error ? error.message : 'Error al eliminar')
          setSyncStatus('error')
          // Rollback on error
          setItems((prev) => [...prev, productId])
        }
      }
    },
    [items, isLoggedIn]
  )

  const toggleWishlist = useCallback(
    async (productId: string): Promise<void> => {
      if (isWishlisted(productId)) {
        await removeFromWishlist(productId)
      } else {
        await addToWishlist(productId)
      }
    },
    [isWishlisted, addToWishlist, removeFromWishlist]
  )

  const clearWishlist = useCallback(() => {
    setItems([])
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    // Note: Server-side clearing would need to be implemented if needed
  }, [])

  const itemCount = items.length

  const contextValue = useMemo(
    () => ({
      items,
      isLoading,
      syncStatus,
      syncError,
      isWishlisted,
      toggleWishlist,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
      itemCount,
      isLoggedIn,
    }),
    [
      items,
      isLoading,
      syncStatus,
      syncError,
      isWishlisted,
      toggleWishlist,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
      itemCount,
      isLoggedIn,
    ]
  )

  return <WishlistContext.Provider value={contextValue}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }
  return context
}
