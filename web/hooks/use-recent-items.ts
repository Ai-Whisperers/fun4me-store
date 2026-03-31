'use client'

import { useState, useEffect, useCallback } from 'react'

export type RecentItemType = 'patient' | 'client' | 'invoice' | 'appointment' | 'lab-order'

export interface RecentItem {
  id: string
  type: RecentItemType
  title: string
  subtitle?: string
  href: string
  timestamp: number
}

const STORAGE_KEY = 'vete_recent_items'
const MAX_ITEMS = 10

function getStoredItems(clinic: string): RecentItem[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${clinic}`)
    if (!stored) return []

    const items = JSON.parse(stored) as RecentItem[]
    // Filter out items older than 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return items.filter((item) => item.timestamp > sevenDaysAgo)
  } catch (_error: unknown) {
    return []
  }
}

function saveItems(clinic: string, items: RecentItem[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(`${STORAGE_KEY}_${clinic}`, JSON.stringify(items))
  } catch (_error: unknown) {
    // Storage quota exceeded or other error
  }
}

export function useRecentItems(clinic: string): {
  items: RecentItem[]
  addItem: (item: Omit<RecentItem, 'timestamp'>) => void
  clearItems: () => void
} {
  const [items, setItems] = useState<RecentItem[]>([])

  // Load items on mount
  useEffect(() => {
    setItems(getStoredItems(clinic))
  }, [clinic])

  const addItem = useCallback(
    (item: Omit<RecentItem, 'timestamp'>) => {
      setItems((currentItems) => {
        // Remove existing item with same id and type
        const filtered = currentItems.filter(
          (existing) => !(existing.id === item.id && existing.type === item.type)
        )

        // Add new item at the start
        const newItems: RecentItem[] = [{ ...item, timestamp: Date.now() }, ...filtered].slice(
          0,
          MAX_ITEMS
        )

        saveItems(clinic, newItems)
        return newItems
      })
    },
    [clinic]
  )

  const clearItems = useCallback(() => {
    setItems([])
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${STORAGE_KEY}_${clinic}`)
    }
  }, [clinic])

  return { items, addItem, clearItems }
}

// Helper to get icon for item type
export function getRecentItemIcon(type: RecentItemType): string {
  switch (type) {
    case 'patient':
      return '🐾'
    case 'client':
      return '👤'
    case 'invoice':
      return '📄'
    case 'appointment':
      return '📅'
    case 'lab-order':
      return '🧪'
    default:
      return '📌'
  }
}

// Helper to get type label
export function getRecentItemTypeLabel(type: RecentItemType): string {
  switch (type) {
    case 'patient':
      return 'Paciente'
    case 'client':
      return 'Cliente'
    case 'invoice':
      return 'Factura'
    case 'appointment':
      return 'Cita'
    case 'lab-order':
      return 'Laboratorio'
    default:
      return ''
  }
}
