'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Search, X, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

/**
 * Generic SearchField Component
 *
 * A reusable search component with debouncing, keyboard navigation, and loading states.
 *
 * @example
 * ```tsx
 * <SearchField
 *   placeholder="Buscar clientes..."
 *   onSearch={async (query) => {
 *     const res = await fetch(`/api/clients?q=${query}`);
 *     return res.json();
 *   }}
 *   renderItem={(client) => (
 *     <div>
 *       <p className="font-bold">{client.name}</p>
 *       <p className="text-sm text-gray-500">{client.email}</p>
 *     </div>
 *   )}
 *   onSelect={(client) => router.push(`/dashboard/clients/${client.id}`)}
 * />
 * ```
 */

interface SearchFieldProps<T> {
  placeholder?: string
  onSearch: (query: string) => Promise<T[]>
  renderItem: (item: T, index: number) => React.ReactNode
  onSelect: (item: T) => void
  minChars?: number
  debounceMs?: number
  emptyMessage?: string
  className?: string
  autoFocus?: boolean
}

export function SearchField<T>({
  placeholder,
  onSearch,
  renderItem,
  onSelect,
  minChars = 2,
  debounceMs = 300,
  emptyMessage,
  className = '',
  autoFocus = false,
}: SearchFieldProps<T>) {
  const t = useTranslations('common')
  const resolvedPlaceholder = placeholder ?? t('search') + '...'
  const resolvedEmptyMessage = emptyMessage ?? t('noResults')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, debounceMs)

  useEffect(() => {
    async function search() {
      if (debouncedQuery.length < minChars) {
        setResults([])
        setIsOpen(false)
        return
      }

      setIsLoading(true)
      try {
        const data = await onSearch(debouncedQuery)
        setResults(data)
        setIsOpen(data.length > 0)
        setSelectedIndex(-1)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }
    search()
  }, [debouncedQuery, minChars, onSearch])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && results[selectedIndex]) {
            onSelect(results[selectedIndex])
            setQuery('')
            setIsOpen(false)
          }
          break
        case 'Escape':
          setIsOpen(false)
          break
      }
    },
    [isOpen, results, selectedIndex, onSelect]
  )

  const handleSelect = useCallback(
    (item: T) => {
      onSelect(item)
      setQuery('')
      setIsOpen(false)
      inputRef.current?.focus()
    },
    [onSelect]
  )

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.focus()
  }, [])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={resolvedPlaceholder}
          className="pl-10 pr-10"
          aria-label={resolvedPlaceholder}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
          autoFocus={autoFocus}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--text-secondary)]" />
        )}
        {query && !isLoading && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label={t('clearSearch')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-[var(--bg-card)] shadow-lg"
        >
          {results.length > 0 ? (
            results.map((item, index) => (
              <li
                key={index}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`cursor-pointer px-4 py-2 ${
                  index === selectedIndex
                    ? 'bg-[var(--primary)] text-white'
                    : 'hover:bg-[var(--bg-hover)]'
                }`}
              >
                {renderItem(item, index)}
              </li>
            ))
          ) : (
            <li className="px-4 py-2 text-[var(--text-secondary)]">{resolvedEmptyMessage}</li>
          )}
        </ul>
      )}
    </div>
  )
}
