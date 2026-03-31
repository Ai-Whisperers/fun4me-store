import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  condition?: () => boolean
  action: () => void
}

export interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      const matchingShortcut = shortcuts.find((shortcut) => {
        const keyMatches = shortcut.key.toLowerCase() === e.key.toLowerCase()
        const ctrlMatches = !!shortcut.ctrlKey === e.ctrlKey
        const metaMatches = !!shortcut.metaKey === e.metaKey
        const shiftMatches = !!shortcut.shiftKey === e.shiftKey
        const altMatches = !!shortcut.altKey === e.altKey
        const conditionMatches = !shortcut.condition || shortcut.condition()

        return (
          keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches && conditionMatches
        )
      })

      if (matchingShortcut) {
        e.preventDefault()
        matchingShortcut.action()
      }
    },
    [shortcuts, enabled]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])
}

// Common shortcuts
export const commonShortcuts = {
  openCommandPalette: (action: () => void) => ({
    key: 'k',
    metaKey: true,
    action,
  }),

  openSearch: (action: () => void) => ({
    key: '/',
    condition: () =>
      !['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName || ''),
    action,
  }),

  closeModal: (isOpen: boolean, action: () => void) => ({
    key: 'Escape',
    condition: () => isOpen,
    action,
  }),

  navigateUp: (action: () => void) => ({
    key: 'ArrowUp',
    action,
  }),

  navigateDown: (action: () => void) => ({
    key: 'ArrowDown',
    action,
  }),

  selectItem: (action: () => void) => ({
    key: 'Enter',
    action,
  }),
}
