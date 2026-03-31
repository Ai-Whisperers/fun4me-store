import { useState, useEffect, useRef, useCallback } from 'react'
import { useKeyboardShortcuts, commonShortcuts } from './use-keyboard-shortcuts'
import { useSearchWithHistory } from './use-search'

export interface CommandPaletteResult {
  id: string
  type: string
  title: string
  subtitle: string
  href: string
  meta?: string
}

export interface UseCommandPaletteOptions {
  clinic: string
  searchFn: (query: string, clinic: string) => Promise<CommandPaletteResult[]>
  onSelect?: (result: CommandPaletteResult) => void
  historyKey?: string
  maxHistoryItems?: number
}

export interface UseCommandPaletteResult {
  // State
  isOpen: boolean
  selectedIndex: number

  // Search
  query: string
  setQuery: (query: string) => void
  results: CommandPaletteResult[]
  isLoading: boolean
  error: string | null
  hasResults: boolean
  recentSearches: CommandPaletteResult[]

  // Actions
  open: () => void
  close: () => void
  toggle: () => void

  // Navigation
  selectNext: () => void
  selectPrevious: () => void
  selectItem: (index?: number) => void

  // History
  addToHistory: (result: CommandPaletteResult) => void
  removeFromHistory: (result: CommandPaletteResult) => void
  clearHistory: () => void

  // Refs
  inputRef: React.RefObject<HTMLInputElement | null>
}

export function useCommandPalette({
  clinic,
  searchFn,
  onSelect,
  historyKey = `commandPaletteHistory_${clinic}`,
  maxHistoryItems = 10,
}: UseCommandPaletteOptions): UseCommandPaletteResult {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Search functionality with history
  const search = useSearchWithHistory({
    clinic,
    searchFn,
    historyKey,
    maxHistoryItems,
  })

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [search.results, search.recentSearches])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      commonShortcuts.openCommandPalette(() => setIsOpen(true)),
      commonShortcuts.openSearch(() => setIsOpen(true)),
      commonShortcuts.closeModal(isOpen, () => setIsOpen(false)),
      commonShortcuts.navigateUp(() =>
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : getMaxIndex()))
      ),
      commonShortcuts.navigateDown(() =>
        setSelectedIndex((prev) => (prev < getMaxIndex() ? prev + 1 : 0))
      ),
      commonShortcuts.selectItem(() => selectItem()),
    ],
    enabled: isOpen,
  })

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Reset query when closed
  useEffect(() => {
    if (!isOpen) {
      search.clearQuery()
      setSelectedIndex(0)
    }
  }, [isOpen, search])

  const getMaxIndex = useCallback(() => {
    const totalItems = search.hasResults ? search.results.length : search.recentSearches.length
    return Math.max(0, totalItems - 1)
  }, [search.hasResults, search.results.length, search.recentSearches.length])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  const selectNext = useCallback(() => {
    setSelectedIndex((prev) => (prev < getMaxIndex() ? prev + 1 : 0))
  }, [getMaxIndex])

  const selectPrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : getMaxIndex()))
  }, [getMaxIndex])

  const selectItem = useCallback(
    (index?: number) => {
      const itemIndex = index ?? selectedIndex
      const allItems = search.hasResults ? search.results : search.recentSearches

      if (allItems[itemIndex]) {
        const selectedItem = allItems[itemIndex]
        onSelect?.(selectedItem)
        search.addToHistory(selectedItem)
        close()
      }
    },
    [selectedIndex, search, onSelect, close]
  )

  return {
    // State
    isOpen,
    selectedIndex,

    // Search
    query: search.query,
    setQuery: search.setQuery,
    results: search.results,
    isLoading: search.isLoading,
    error: search.error,
    hasResults: search.hasResults,
    recentSearches: search.recentSearches,

    // Actions
    open,
    close,
    toggle,

    // Navigation
    selectNext,
    selectPrevious,
    selectItem,

    // History
    addToHistory: search.addToHistory,
    removeFromHistory: search.removeFromHistory,
    clearHistory: search.clearHistory,

    // Refs
    inputRef,
  }
}
