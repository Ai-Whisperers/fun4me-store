'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Command } from 'lucide-react'
import { CommandInput } from './CommandInput'
import { CommandList } from './CommandList'
import { useCommandSearch } from './useCommandSearch'
import { useKeyboardNav } from './useKeyboardNav'
import type { CommandPaletteProps } from './command-types'

export function CommandPalette({
  isOpen,
  onClose,
}: CommandPaletteProps): React.ReactElement | null {
  const { clinic } = useParams() as { clinic: string }
  const [selectedIndex, setSelectedIndex] = useState(0)

  const { query, setQuery, groupedCommands, flatCommands } = useCommandSearch({
    clinic,
    isOpen,
    onClose,
  })

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen, setQuery])

  // Keyboard navigation handlers
  const handleNavigate = useCallback(
    (direction: 'up' | 'down'): void => {
      if (direction === 'down') {
        setSelectedIndex((i) => Math.min(i + 1, flatCommands.length - 1))
      } else {
        setSelectedIndex((i) => Math.max(i - 1, 0))
      }
    },
    [flatCommands.length]
  )

  const handleSelect = useCallback((): void => {
    if (flatCommands[selectedIndex]) {
      flatCommands[selectedIndex].action()
    }
  }, [flatCommands, selectedIndex])

  // Setup keyboard navigation
  useKeyboardNav({
    isOpen,
    selectedIndex,
    flatCommands,
    onClose,
    onNavigate: handleNavigate,
    onSelect: handleSelect,
  })

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100]">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Palette */}
        <div className="flex items-start justify-center px-4 pt-[15vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Search Input */}
            <CommandInput query={query} onChange={setQuery} onClose={onClose} isOpen={isOpen} />

            {/* Results */}
            <CommandList
              groupedCommands={groupedCommands}
              flatCommands={flatCommands}
              selectedIndex={selectedIndex}
              onSelectIndex={setSelectedIndex}
            />

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-white px-1.5 py-0.5">↑</kbd>
                  <kbd className="rounded border bg-white px-1.5 py-0.5">↓</kbd>
                  <span>navegar</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-white px-1.5 py-0.5">↵</kbd>
                  <span>seleccionar</span>
                </span>
              </div>
              <span className="flex items-center gap-1">
                <Command className="h-3 w-3" />K para abrir
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}

// Global keyboard listener hook
export function useCommandPalette(): { isOpen: boolean; open: () => void; close: () => void } {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }
}

// Re-export types for convenience
export type { CommandPaletteProps, CommandItem } from './command-types'
