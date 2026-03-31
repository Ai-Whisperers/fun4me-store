'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Search,
  X,
  Dog,
  Cat,
  Calendar,
  User,
  Package,
  Settings,
  FileText,
  Pill,
  Syringe,
  Loader2,
  ArrowRight,
} from 'lucide-react'

interface SearchResult {
  id: string
  type: 'pet' | 'appointment' | 'product' | 'page' | 'action'
  title: string
  subtitle?: string
  icon?: string
  url?: string
  action?: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

const QUICK_ACTIONS: SearchResult[] = [
  {
    id: 'new-pet',
    type: 'action',
    title: 'Nueva Mascota',
    subtitle: 'Registrar nueva mascota',
    icon: 'dog',
  },
  {
    id: 'new-appointment',
    type: 'action',
    title: 'Nueva Cita',
    subtitle: 'Agendar una cita',
    icon: 'calendar',
  },
  {
    id: 'dashboard',
    type: 'page',
    title: 'Dashboard',
    subtitle: 'Ir al panel principal',
    icon: 'user',
  },
  {
    id: 'store',
    type: 'page',
    title: 'Tienda',
    subtitle: 'Ver productos',
    icon: 'package',
  },
]

function getIcon(iconName: string | undefined, species?: string): React.ReactNode {
  const iconClass = 'w-5 h-5'

  switch (iconName || species) {
    case 'dog':
      return <Dog className={iconClass} />
    case 'cat':
      return <Cat className={iconClass} />
    case 'calendar':
      return <Calendar className={iconClass} />
    case 'user':
      return <User className={iconClass} />
    case 'package':
      return <Package className={iconClass} />
    case 'settings':
      return <Settings className={iconClass} />
    case 'file':
      return <FileText className={iconClass} />
    case 'pill':
      return <Pill className={iconClass} />
    case 'syringe':
      return <Syringe className={iconClass} />
    default:
      return <Search className={iconClass} />
  }
}

export function CommandPalette({
  isOpen,
  onClose,
}: CommandPaletteProps): React.ReactElement | null {
  const router = useRouter()
  const params = useParams()
  const clinic = params?.clinic as string

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Search when query changes
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (!query.trim()) {
        setResults([])
        return
      }

      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&clinic=${clinic}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || [])
        }
      } catch (_error: unknown) {
        // Search error - silently fail
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [query, clinic])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = query.trim() ? results : QUICK_ACTIONS

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % items.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length)
          break
        case 'Enter':
          e.preventDefault()
          if (items[selectedIndex]) {
            handleSelect(items[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [query, results, selectedIndex, onClose]
  )

  // Handle selection
  const handleSelect = useCallback(
    (item: SearchResult) => {
      onClose()

      if (item.action) {
        item.action()
        return
      }

      if (item.url) {
        router.push(item.url)
        return
      }

      // Default navigation based on type and id
      switch (item.type) {
        case 'pet':
          router.push(`/${clinic}/portal/pets/${item.id}`)
          break
        case 'appointment':
          router.push(`/${clinic}/portal/appointments/${item.id}`)
          break
        case 'product':
          router.push(`/${clinic}/store/products/${item.id}`)
          break
        case 'page':
          switch (item.id) {
            case 'dashboard':
              router.push(`/${clinic}/portal/dashboard`)
              break
            case 'store':
              router.push(`/${clinic}/store`)
              break
            case 'new-pet':
              router.push(`/${clinic}/portal/pets/new`)
              break
            case 'new-appointment':
              router.push(`/${clinic}/book`)
              break
          }
          break
        case 'action':
          switch (item.id) {
            case 'new-pet':
              router.push(`/${clinic}/portal/pets/new`)
              break
            case 'new-appointment':
              router.push(`/${clinic}/book`)
              break
          }
          break
      }
    },
    [clinic, router, onClose]
  )

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      selectedEl?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!isOpen) return null

  const displayItems = query.trim() ? results : QUICK_ACTIONS

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="flex min-h-full items-start justify-center p-4 pt-[15vh]">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Búsqueda global"
          className="relative w-full max-w-xl transform overflow-hidden rounded-2xl bg-[var(--bg-paper)] shadow-2xl transition-all"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-[var(--border-light,#f3f4f6)] px-4 py-4">
            <Search className="h-5 w-5 flex-shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar mascotas, citas, productos..."
              className="flex-1 bg-transparent text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              aria-label="Buscar"
              aria-autocomplete="list"
              aria-controls="search-results"
            />
            {loading && (
              <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" aria-hidden="true" />
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-subtle)]"
              aria-label="Cerrar búsqueda"
            >
              <X className="h-5 w-5 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            id="search-results"
            role="listbox"
            className="max-h-[60vh] overflow-y-auto py-2"
          >
            {!query.trim() && (
              <div className="px-4 py-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Acciones Rápidas
                </p>
              </div>
            )}

            {query.trim() && results.length === 0 && !loading && (
              <div className="px-4 py-8 text-center">
                <Search
                  className="mx-auto mb-3 h-12 w-12 text-[var(--border,#e5e7eb)]"
                  aria-hidden="true"
                />
                <p className="font-medium text-[var(--text-secondary)]">
                  No se encontraron resultados
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Intenta con otro término de búsqueda
                </p>
              </div>
            )}

            {displayItems.map((item, index) => (
              <button
                key={item.id}
                data-index={index}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                    index === selectedIndex
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  {getIcon(
                    item.icon,
                    item.type === 'pet' ? item.subtitle?.toLowerCase() : undefined
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title}</p>
                  {item.subtitle && (
                    <p className="truncate text-sm text-[var(--text-muted)]">{item.subtitle}</p>
                  )}
                </div>
                <ArrowRight
                  className={`h-4 w-4 flex-shrink-0 transition-opacity ${
                    index === selectedIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--border-light,#f3f4f6)] bg-[var(--bg-subtle)] px-4 py-3 text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-[var(--border,#e5e7eb)] bg-[var(--bg-paper)] px-1.5 py-0.5 text-[var(--text-secondary)]">
                  ↑
                </kbd>
                <kbd className="rounded border border-[var(--border,#e5e7eb)] bg-[var(--bg-paper)] px-1.5 py-0.5 text-[var(--text-secondary)]">
                  ↓
                </kbd>
                <span className="ml-1">navegar</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-[var(--border,#e5e7eb)] bg-[var(--bg-paper)] px-1.5 py-0.5 text-[var(--text-secondary)]">
                  ↵
                </kbd>
                <span className="ml-1">seleccionar</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-[var(--border,#e5e7eb)] bg-[var(--bg-paper)] px-1.5 py-0.5 text-[var(--text-secondary)]">
                  esc
                </kbd>
                <span className="ml-1">cerrar</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook to manage command palette state
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    toggle: () => setIsOpen((prev) => !prev),
  }
}
