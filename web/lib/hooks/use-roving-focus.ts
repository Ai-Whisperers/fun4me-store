/**
 * Roving Focus Hook
 *
 * A11Y-002: Keyboard navigation accessibility
 *
 * Implements roving tabindex pattern for keyboard navigation in groups.
 * Common in toolbars, menus, and tab lists.
 */

'use client'

import { useCallback, useState, useRef, type KeyboardEvent, type RefObject } from 'react'

export type Direction = 'horizontal' | 'vertical' | 'both'

export interface UseRovingFocusOptions {
  /** Navigation direction */
  direction?: Direction
  /** Wrap around when reaching boundaries */
  loop?: boolean
  /** Orientation for ARIA */
  orientation?: 'horizontal' | 'vertical'
}

export interface RovingFocusItem {
  ref: RefObject<HTMLElement>
  tabIndex: number
  onKeyDown: (event: KeyboardEvent) => void
}

/**
 * Hook for roving focus pattern
 * Returns a function to register items and handlers for keyboard navigation
 */
export function useRovingFocus(options: UseRovingFocusOptions = {}) {
  const { direction = 'horizontal', loop = true } = options

  const [focusedIndex, setFocusedIndex] = useState(0)
  const itemsRef = useRef<HTMLElement[]>([])

  const registerItem = useCallback((element: HTMLElement | null, index: number) => {
    if (element) {
      itemsRef.current[index] = element
    }
  }, [])

  const focusItem = useCallback((index: number) => {
    const items = itemsRef.current.filter(Boolean)
    if (items.length === 0) return

    let targetIndex = index
    if (loop) {
      targetIndex = ((index % items.length) + items.length) % items.length
    } else {
      targetIndex = Math.max(0, Math.min(index, items.length - 1))
    }

    setFocusedIndex(targetIndex)
    items[targetIndex]?.focus()
  }, [loop])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent, currentIndex: number) => {
      const items = itemsRef.current.filter(Boolean)
      if (items.length === 0) return

      let nextIndex = currentIndex
      let handled = false

      switch (event.key) {
        case 'ArrowRight':
          if (direction === 'horizontal' || direction === 'both') {
            nextIndex = currentIndex + 1
            handled = true
          }
          break
        case 'ArrowLeft':
          if (direction === 'horizontal' || direction === 'both') {
            nextIndex = currentIndex - 1
            handled = true
          }
          break
        case 'ArrowDown':
          if (direction === 'vertical' || direction === 'both') {
            nextIndex = currentIndex + 1
            handled = true
          }
          break
        case 'ArrowUp':
          if (direction === 'vertical' || direction === 'both') {
            nextIndex = currentIndex - 1
            handled = true
          }
          break
        case 'Home':
          nextIndex = 0
          handled = true
          break
        case 'End':
          nextIndex = items.length - 1
          handled = true
          break
      }

      if (handled) {
        event.preventDefault()
        focusItem(nextIndex)
      }
    },
    [direction, focusItem]
  )

  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: focusedIndex === index ? 0 : -1,
      onKeyDown: (event: KeyboardEvent) => handleKeyDown(event, index),
      ref: (element: HTMLElement | null) => registerItem(element, index),
      'aria-selected': focusedIndex === index,
    }),
    [focusedIndex, handleKeyDown, registerItem]
  )

  return {
    focusedIndex,
    setFocusedIndex,
    focusItem,
    getItemProps,
    registerItem,
  }
}

/**
 * Get keyboard navigation props for a container
 */
export function getGroupProps(orientation: 'horizontal' | 'vertical' = 'horizontal') {
  return {
    role: 'group',
    'aria-orientation': orientation,
  }
}

export default useRovingFocus
