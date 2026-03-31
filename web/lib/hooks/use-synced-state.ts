'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

/**
 * Sync status
 */
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

/**
 * Result of useSyncedState hook
 */
export interface SyncedStateResult<T> {
  /** Current local state */
  state: T
  /** Set the local state (will trigger sync) */
  setState: (value: T | ((prev: T) => T)) => void
  /** Current sync status */
  syncStatus: SyncStatus
  /** Whether data is being synced to remote */
  isSyncing: boolean
  /** Last sync error if any */
  syncError: Error | undefined
  /** Force sync to remote */
  sync: () => Promise<void>
  /** Reload from remote */
  reload: () => Promise<void>
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
}

/**
 * Options for useSyncedState hook
 */
export interface UseSyncedStateOptions<T> {
  /** Storage key for localStorage persistence (optional) */
  storageKey?: string
  /** Initial/default state */
  initialState: T
  /** Function to load state from remote */
  loadFromRemote?: () => Promise<T>
  /** Function to save state to remote */
  saveToRemote?: (state: T) => Promise<void>
  /** Debounce delay in milliseconds for auto-sync (default: 500) */
  debounceMs?: number
  /** Whether to auto-sync on state change (default: true if saveToRemote provided) */
  autoSync?: boolean
  /** Called on successful sync */
  onSyncSuccess?: () => void
  /** Called on sync error */
  onSyncError?: (error: Error) => void
  /** Called when state is loaded from remote */
  onLoad?: (state: T) => void
  /** Whether user is authenticated (disables remote sync if false) */
  isAuthenticated?: boolean
}

/**
 * Hook for managing state that syncs between localStorage and a remote API.
 * Useful for cart, wishlist, and other user data that needs persistence.
 *
 * @example
 * ```typescript
 * // Cart context usage
 * interface CartItem { id: string; quantity: number }
 *
 * function CartProvider({ children }: { children: ReactNode }) {
 *   const { state: items, setState: setItems, isSyncing } = useSyncedState<CartItem[]>({
 *     storageKey: 'cart',
 *     initialState: [],
 *     loadFromRemote: async () => {
 *       const res = await fetch('/api/store/cart')
 *       return res.json()
 *     },
 *     saveToRemote: async (items) => {
 *       await fetch('/api/store/cart', {
 *         method: 'POST',
 *         body: JSON.stringify({ items }),
 *       })
 *     },
 *     debounceMs: 500,
 *     isAuthenticated: !!user,
 *   })
 *
 *   const addItem = (item: CartItem) => {
 *     setItems(prev => [...prev, item])
 *   }
 *
 *   return (
 *     <CartContext.Provider value={{ items, addItem, isSyncing }}>
 *       {children}
 *     </CartContext.Provider>
 *   )
 * }
 * ```
 */
export function useSyncedState<T>(
  options: UseSyncedStateOptions<T>
): SyncedStateResult<T> {
  const {
    storageKey,
    initialState,
    loadFromRemote,
    saveToRemote,
    debounceMs = 500,
    autoSync = !!saveToRemote,
    onSyncSuccess,
    onSyncError,
    onLoad,
    isAuthenticated = true,
  } = options

  // Initialize state from localStorage if available
  const [state, setStateInternal] = useState<T>(() => {
    if (typeof window === 'undefined' || !storageKey) return initialState
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : initialState
    } catch (_error: unknown) {
      return initialState
    }
  })

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncError, setSyncError] = useState<Error | undefined>(undefined)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Refs for tracking
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncedStateRef = useRef<T>(state)
  const isMountedRef = useRef(true)

  // Save to localStorage when state changes
  useEffect(() => {
    if (typeof window === 'undefined' || !storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch (e: unknown) {
      console.error('Error saving to localStorage:', e)
    }
  }, [state, storageKey])

  // Load from remote on mount (if authenticated)
  useEffect(() => {
    isMountedRef.current = true

    if (!loadFromRemote || !isAuthenticated) return

    const loadData = async () => {
      try {
        setSyncStatus('syncing')
        const remoteState = await loadFromRemote()
        if (isMountedRef.current) {
          setStateInternal(remoteState)
          lastSyncedStateRef.current = remoteState
          setSyncStatus('synced')
          onLoad?.(remoteState)
        }
      } catch (e) {
        if (isMountedRef.current) {
          setSyncStatus('error')
          setSyncError(e instanceof Error ? e : new Error(String(e)))
        }
      }
    }

    loadData()

    return () => {
      isMountedRef.current = false
    }
  }, [loadFromRemote, isAuthenticated, onLoad])

  // Sync to remote
  const syncToRemote = useCallback(async () => {
    if (!saveToRemote || !isAuthenticated) return

    setSyncStatus('syncing')
    setSyncError(undefined)

    try {
      await saveToRemote(state)
      if (isMountedRef.current) {
        setSyncStatus('synced')
        setHasUnsavedChanges(false)
        lastSyncedStateRef.current = state
        onSyncSuccess?.()
      }
    } catch (e) {
      if (isMountedRef.current) {
        const error = e instanceof Error ? e : new Error(String(e))
        setSyncStatus('error')
        setSyncError(error)
        onSyncError?.(error)
      }
    }
  }, [state, saveToRemote, isAuthenticated, onSyncSuccess, onSyncError])

  // Debounced auto-sync
  useEffect(() => {
    if (!autoSync || !isAuthenticated) return

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Check if state has actually changed from last sync
    const hasChanged = JSON.stringify(state) !== JSON.stringify(lastSyncedStateRef.current)
    if (!hasChanged) return

    setHasUnsavedChanges(true)

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      syncToRemote()
    }, debounceMs)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [state, autoSync, debounceMs, syncToRemote, isAuthenticated])

  // Public setState that triggers sync
  const setState = useCallback((value: T | ((prev: T) => T)) => {
    setStateInternal(value)
  }, [])

  // Force sync
  const sync = useCallback(async () => {
    await syncToRemote()
  }, [syncToRemote])

  // Reload from remote
  const reload = useCallback(async () => {
    if (!loadFromRemote || !isAuthenticated) return

    setSyncStatus('syncing')
    try {
      const remoteState = await loadFromRemote()
      if (isMountedRef.current) {
        setStateInternal(remoteState)
        lastSyncedStateRef.current = remoteState
        setSyncStatus('synced')
        setHasUnsavedChanges(false)
        onLoad?.(remoteState)
      }
    } catch (e: unknown) {
      if (isMountedRef.current) {
        setSyncStatus('error')
        setSyncError(e instanceof Error ? e : new Error(String(e)))
      }
    }
  }, [loadFromRemote, isAuthenticated, onLoad])

  return {
    state,
    setState,
    syncStatus,
    isSyncing: syncStatus === 'syncing',
    syncError,
    sync,
    reload,
    hasUnsavedChanges,
  }
}

/**
 * Simplified version for pure localStorage sync (no remote).
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const { state, setState } = useSyncedState<T>({
    storageKey: key,
    initialState: initialValue,
  })

  return [state, setState]
}
