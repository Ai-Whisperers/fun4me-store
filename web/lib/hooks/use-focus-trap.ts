/**
 * Focus Trap Hook
 *
 * A11Y-002: Keyboard navigation accessibility
 *
 * Traps focus within a container element, preventing focus from escaping.
 * Essential for modal dialogs and other overlays.
 */

'use client'

import { useEffect, useRef, type RefObject } from 'react'

/**
 * Selectors for focusable elements
 */
const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  'details > summary:first-of-type',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ')

/**
 * Options for the focus trap hook
 */
export interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  isActive: boolean
  /** Auto-focus the first focusable element when trap activates */
  autoFocus?: boolean
  /** Return focus to the previously focused element when trap deactivates */
  returnFocus?: boolean
  /** Callback when escape key is pressed */
  onEscape?: () => void
  /** Initial element to focus (by selector or ref) */
  initialFocus?: string | RefObject<HTMLElement>
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
  return Array.from(elements).filter(
    (el) =>
      !el.hasAttribute('disabled') &&
      el.getAttribute('aria-hidden') !== 'true' &&
      !isHidden(el)
  )
}

/**
 * Check if element is hidden
 * Note: offsetParent doesn't work in jsdom, so we check computed style
 */
function isHidden(el: HTMLElement): boolean {
  // In jsdom/test environment, offsetParent may always be null
  // Fall back to checking display/visibility
  if (typeof window !== 'undefined' && window.getComputedStyle) {
    const style = window.getComputedStyle(el)
    return style.display === 'none' || style.visibility === 'hidden'
  }
  return false
}

/**
 * Hook to trap focus within a container element
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  options: UseFocusTrapOptions
): void {
  const {
    isActive,
    autoFocus = true,
    returnFocus = true,
    onEscape,
    initialFocus,
  } = options

  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !ref.current) {
      return
    }

    const container = ref.current

    // Store currently focused element for return focus
    if (returnFocus) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement
    }

    // Auto-focus first focusable element or specified initial focus
    if (autoFocus) {
      requestAnimationFrame(() => {
        const focusableElements = getFocusableElements(container)

        if (initialFocus) {
          if (typeof initialFocus === 'string') {
            const element = container.querySelector<HTMLElement>(initialFocus)
            if (element) {
              element.focus()
              return
            }
          } else if (initialFocus.current) {
            initialFocus.current.focus()
            return
          }
        }

        if (focusableElements.length > 0) {
          focusableElements[0].focus()
        }
      })
    }

    function handleKeyDown(event: KeyboardEvent) {
      // Handle Escape key
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault()
        onEscape()
        return
      }

      // Handle Tab key for focus trapping
      if (event.key !== 'Tab') {
        return
      }

      const focusableElements = getFocusableElements(container)

      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const currentIndex = focusableElements.indexOf(
        document.activeElement as HTMLElement
      )

      // Shift+Tab at first element -> go to last
      if (event.shiftKey && (document.activeElement === firstElement || currentIndex === -1)) {
        event.preventDefault()
        lastElement.focus()
        return
      }

      // Tab at last element -> go to first
      if (!event.shiftKey && (document.activeElement === lastElement || currentIndex === -1)) {
        event.preventDefault()
        firstElement.focus()
        return
      }
    }

    // Handle clicks outside the trap to prevent focus escape
    function handleFocusIn(event: FocusEvent) {
      if (!container.contains(event.target as Node)) {
        event.preventDefault()
        const focusableElements = getFocusableElements(container)
        if (focusableElements.length > 0) {
          focusableElements[0].focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)

      // Return focus to previously focused element
      if (returnFocus && previouslyFocusedRef.current) {
        requestAnimationFrame(() => {
          previouslyFocusedRef.current?.focus()
        })
      }
    }
  }, [isActive, autoFocus, returnFocus, onEscape, initialFocus, ref])
}

/**
 * Simple focus trap hook that returns a ref
 * Useful for components that manage their own ref
 */
export function useFocusTrapRef<T extends HTMLElement = HTMLElement>(
  options: Omit<UseFocusTrapOptions, 'isActive'> & { isActive?: boolean }
): RefObject<T | null> {
  const ref = useRef<T | null>(null)
  useFocusTrap(ref, { isActive: true, ...options })
  return ref
}

export default useFocusTrap
