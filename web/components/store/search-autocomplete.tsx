'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'

import { useRouter } from 'next/navigation'
import { Search, X, Loader2, Package, Tag, ArrowRight, Clock, Sparkles } from 'lucide-react'
import type { SearchSuggestion } from '@/lib/types/store'

interface Props {
  clinic: string
  placeholder?: string
  className?: string
  inputClassName?: string
  onSearch?: (query: string) => void
  autoFocus?: boolean
}

const RECENT_SEARCHES_KEY = 'store_recent_searches'
const MAX_RECENT_SEARCHES = 5

export default function SearchAutocomplete({
  clinic,
  placeholder = 'Buscar productos...',
  className = '',
  inputClassName = '',
  onSearch,
  autoFocus = false,
}: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored))
      } catch (_error: unknown) {
        // Ignore parse errors
      }
    }
  }, [])

  // Fetch suggestions
  const fetchSuggestions = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSuggestions([])
        return
      }

      setLoading(true)
      try {
        const res = await fetch(
          `/api/store/search?clinic=${clinic}&q=${encodeURIComponent(searchQuery)}&limit=8`
        )
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.suggestions || [])
        }
      } catch (_error: unknown) {
        // Search error - silently fail
      } finally {
        setLoading(false)
      }
    },
    [clinic]
  )

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(query)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, fetchSuggestions])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Save recent search
  const saveRecentSearch = (searchQuery: string) => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(
      0,
      MAX_RECENT_SEARCHES
    )
    setRecentSearches(updated)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  }

  // Handle search submit
  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return

    saveRecentSearch(searchQuery)
    setIsOpen(false)

    if (onSearch) {
      onSearch(searchQuery)
    } else {
      router.push(`/${clinic}/store?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setIsOpen(false)
    setQuery('')

    switch (suggestion.type) {
      case 'product':
        if (suggestion.id) {
          router.push(`/${clinic}/store/product/${suggestion.id}`)
        }
        break
      case 'category':
        if (suggestion.slug) {
          router.push(`/${clinic}/store?category=${suggestion.slug}`)
        }
        break
      case 'brand':
        if (suggestion.slug) {
          router.push(`/${clinic}/store?brand=${suggestion.slug}`)
        }
        break
      case 'query':
        handleSearch(query)
        break
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = suggestions.length + (query.length >= 2 ? 0 : recentSearches.length)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % totalItems)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex])
        } else if (selectedIndex >= suggestions.length && query.length < 2) {
          const recentIndex = selectedIndex - suggestions.length
          if (recentSearches[recentIndex]) {
            handleSearch(recentSearches[recentIndex])
          }
        } else {
          handleSearch(query)
        }
        break
      case 'Escape':
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  }

  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return 'Gs 0'
    return `Gs ${price.toLocaleString('es-PY')}`
  }

  const showDropdown = isOpen && (query.length >= 2 || recentSearches.length > 0)

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSearch(query)
        }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedIndex(-1)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-12 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] ${inputClassName}`}
        />
        {loading && (
          <Loader2 className="absolute right-14 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-gray-400" />
        )}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setSuggestions([])
              inputRef.current?.focus()
            }}
            className="absolute right-2 top-1/2 flex min-h-[40px] min-w-[40px] -translate-y-1/2 items-center justify-center rounded-full p-2 hover:bg-gray-100"
            aria-label="Limpiar busqueda"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-hidden overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl"
        >
          {/* Search Suggestions */}
          {query.length >= 2 && suggestions.length > 0 && (
            <div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.id || suggestion.name}-${index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`flex min-h-[56px] w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 ${
                    selectedIndex === index ? 'bg-gray-50' : ''
                  }`}
                >
                  {suggestion.type === 'product' && (
                    <>
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {suggestion.image_url ? (
                          <Image
                            src={suggestion.image_url}
                            alt={suggestion.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[var(--text-primary)]">
                          {suggestion.name}
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          {suggestion.category && (
                            <span className="text-[var(--text-muted)]">{suggestion.category}</span>
                          )}
                          {suggestion.price && (
                            <span className="font-medium text-[var(--primary)]">
                              {formatPrice(suggestion.price)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    </>
                  )}

                  {suggestion.type === 'category' && (
                    <>
                      <div className="bg-[var(--primary)]/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                        <Tag className="h-5 w-5 text-[var(--primary)]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-[var(--text-muted)]">Categoría</p>
                        <p className="font-medium text-[var(--text-primary)]">{suggestion.name}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </>
                  )}

                  {suggestion.type === 'brand' && (
                    <>
                      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {suggestion.image_url ? (
                          <Image
                            src={suggestion.image_url}
                            alt={suggestion.name}
                            fill
                            className="object-contain p-1"
                            sizes="40px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Sparkles className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-[var(--text-muted)]">Marca</p>
                        <p className="font-medium text-[var(--text-primary)]">{suggestion.name}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </>
                  )}

                  {suggestion.type === 'query' && (
                    <>
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <Search className="h-5 w-5 text-gray-500" />
                      </div>
                      <p className="flex-1 font-medium text-[var(--text-primary)]">
                        {suggestion.name}
                      </p>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {query.length >= 2 && suggestions.length === 0 && !loading && (
            <div className="px-4 py-8 text-center">
              <p className="text-[var(--text-muted)]">No encontramos resultados para "{query}"</p>
              <button
                onClick={() => handleSearch(query)}
                className="mt-2 font-medium text-[var(--primary)] hover:underline"
              >
                Buscar de todos modos →
              </button>
            </div>
          )}

          {/* Recent Searches */}
          {query.length < 2 && recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2">
                <span className="text-sm font-medium text-[var(--text-muted)]">
                  Búsquedas recientes
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-[var(--primary)] hover:underline"
                  aria-label="Limpiar busquedas recientes"
                >
                  Limpiar
                </button>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={search}
                  onClick={() => handleSearch(search)}
                  className={`flex min-h-[52px] w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 ${
                    selectedIndex === suggestions.length + index ? 'bg-gray-50' : ''
                  }`}
                >
                  <Clock className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="flex-1 text-[var(--text-secondary)]">{search}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches (placeholder for future) */}
          {query.length < 2 && recentSearches.length === 0 && (
            <div className="px-4 py-6 text-center text-[var(--text-muted)]">
              <Search className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p>Escribe para buscar productos</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
