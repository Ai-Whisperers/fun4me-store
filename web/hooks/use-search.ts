import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDebounce } from './use-debounce'
import { useLocalStorage } from './use-local-storage'

export interface SearchResult {
  id: string
  type: string
  title: string
  subtitle: string
  href: string
  meta?: string
}

export interface UseSearchOptions {
  debounceMs?: number
  minQueryLength?: number
  searchFn: (query: string, clinic: string) => Promise<SearchResult[]>
  clinic: string
}

export interface UseSearchResult {
  query: string
  setQuery: (query: string) => void
  results: SearchResult[]
  isLoading: boolean
  error: string | null
  hasResults: boolean
  debouncedQuery: string
  clearResults: () => void
  clearQuery: () => void
}

export function useSearch({
  debounceMs = 300,
  minQueryLength = 2,
  searchFn,
  clinic,
}: UseSearchOptions): UseSearchResult {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedQuery = useDebounce(query, debounceMs)

  // Perform search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.length < minQueryLength) {
        setResults([])
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const searchResults = await searchFn(debouncedQuery, clinic)
        setResults(searchResults)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [debouncedQuery, searchFn, clinic, minQueryLength])

  const clearResults = useCallback(() => {
    setResults([])
    setError(null)
  }, [])

  const clearQuery = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
  }, [])

  const hasResults = useMemo(() => results.length > 0, [results.length])

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    hasResults,
    debouncedQuery,
    clearResults,
    clearQuery,
  }
}

// Hook for managing search with localStorage history
export function useSearchWithHistory(
  options: UseSearchOptions & {
    historyKey: string
    maxHistoryItems?: number
  }
) {
  const { historyKey, maxHistoryItems = 10, ...searchOptions } = options

  const [recentSearches, setRecentSearches, clearHistory] = useLocalStorage<SearchResult[]>(
    historyKey,
    []
  )

  const search = useSearch(searchOptions)

  const addToHistory = useCallback(
    (result: SearchResult) => {
      setRecentSearches((prev) => {
        // Remove if already exists
        const filtered = prev.filter((item) => item.id !== result.id || item.type !== result.type)
        // Add to beginning
        const updated = [result, ...filtered]
        // Limit history size
        return updated.slice(0, maxHistoryItems)
      })
    },
    [setRecentSearches, maxHistoryItems]
  )

  const removeFromHistory = useCallback(
    (result: SearchResult) => {
      setRecentSearches((prev) =>
        prev.filter((item) => !(item.id === result.id && item.type === result.type))
      )
    },
    [setRecentSearches]
  )

  return {
    ...search,
    recentSearches,
    addToHistory,
    removeFromHistory,
    clearHistory,
  }
}
