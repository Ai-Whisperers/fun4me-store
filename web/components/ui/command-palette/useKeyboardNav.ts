import { useEffect } from 'react'
import type { CommandItem } from './command-types'

interface UseKeyboardNavProps {
  isOpen: boolean
  selectedIndex: number
  flatCommands: CommandItem[]
  onClose: () => void
  onNavigate: (direction: 'up' | 'down') => void
  onSelect: () => void
}

export function useKeyboardNav({
  isOpen,
  selectedIndex,
  flatCommands,
  onClose,
  onNavigate,
  onSelect,
}: UseKeyboardNavProps): void {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          onNavigate('down')
          break
        case 'ArrowUp':
          e.preventDefault()
          onNavigate('up')
          break
        case 'Enter':
          e.preventDefault()
          onSelect()
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, flatCommands, onClose, onNavigate, onSelect])
}
