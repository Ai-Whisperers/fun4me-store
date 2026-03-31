'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  User,
  PawPrint,
  Calendar,
  FileText,
  Package,
  ArrowRight,
  Clock,
  Command,
  Loader2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCommandPalette } from '@/hooks/use-command-palette'
import { ErrorBoundary } from '@/components/shared'

interface SearchResult {
  id: string
  type: 'client' | 'pet' | 'appointment' | 'invoice' | 'product'
  title: string
  subtitle: string
  href: string
  meta?: string
  url?: string
}

interface GlobalSearchProps {
  clinic: string
}

// Search function for the command palette
const searchGlobalData = async (query: string, clinic: string): Promise<SearchResult[]> => {
  try {
    const response = await fetch(`/api/search?clinic=${clinic}&q=${encodeURIComponent(query)}`)
    if (response.ok) {
      const data = await response.json()
      // Map API results to component format (url -> href)
      return (data.results || []).map((r: SearchResult & { url?: string }) => ({
        ...r,
        href: r.href || r.url || '',
      }))
    } else {
      // Mock results for demo
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'client',
          title: 'Juan Pérez',
          subtitle: 'juan@email.com • +595 981 123456',
          href: `/${clinic}/dashboard/clients/1`,
        },
        {
          id: '2',
          type: 'pet',
          title: 'Max',
          subtitle: 'Perro • Labrador • Juan Pérez',
          href: `/${clinic}/dashboard/pets/2`,
        },
        {
          id: '3',
          type: 'appointment',
          title: 'Consulta - Max',
          subtitle: 'Hoy 14:30 • Dr. García',
          href: `/${clinic}/dashboard/appointments/3`,
          meta: 'Pendiente',
        },
      ]
      return mockResults.filter(
        (r) =>
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    }
  } catch (error) {
    // Client-side error logging - only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Search error:', error)
    }
    return []
  }
}

export function GlobalSearch({ clinic }: GlobalSearchProps): React.ReactElement {
  const router = useRouter()
  const t = useTranslations('dashboard.globalSearch')

  const commandPalette = useCommandPalette({
    clinic,
    searchFn: searchGlobalData,
    onSelect: (result) => {
      router.push(result.href)
    },
    historyKey: `recentSearches_${clinic}`,
    maxHistoryItems: 5,
  })

  const getIcon = (type: SearchResult['type']): React.ReactNode => {
    switch (type) {
      case 'client':
        return <User className="h-5 w-5" />
      case 'pet':
        return <PawPrint className="h-5 w-5" />
      case 'appointment':
        return <Calendar className="h-5 w-5" />
      case 'invoice':
        return <FileText className="h-5 w-5" />
      case 'product':
        return <Package className="h-5 w-5" />
      default:
        return <Search className="h-5 w-5" />
    }
  }

  const getTypeLabel = (type: SearchResult['type']): string => {
    return t(`types.${type}`)
  }

  return (
    <ErrorBoundary>
      <div>
        {/* Trigger Button */}
        <button
          onClick={commandPalette.open}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">{t('searchPlaceholder')}</span>
          <kbd className="hidden items-center gap-0.5 rounded border bg-white px-1.5 py-0.5 text-xs font-medium shadow-sm md:flex">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>

        {/* Search Modal */}
        <AnimatePresence>
          {commandPalette.isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={commandPalette.close}
                className="fixed inset-0 z-50 bg-black/50"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.15 }}
                className="fixed left-1/2 top-[10%] z-50 w-full max-w-2xl -translate-x-1/2 px-4"
              >
                <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
                  {/* Search Input */}
                  <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                    <Search className="h-5 w-5 text-gray-400" />
                    <input
                      ref={commandPalette.inputRef}
                      type="text"
                      value={commandPalette.query}
                      onChange={(e) => commandPalette.setQuery(e.target.value)}
                      placeholder={t('searchPrompt')}
                      className="flex-1 text-lg outline-none placeholder:text-gray-400"
                    />
                    {commandPalette.isLoading && (
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    )}
                    {commandPalette.query && !commandPalette.isLoading && (
                      <button
                        onClick={() => commandPalette.setQuery('')}
                        className="rounded-full p-1 transition-colors hover:bg-gray-100"
                        aria-label={t('clearSearch')}
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Results */}
                  <div className="max-h-[60vh] overflow-y-auto">
                    {commandPalette.hasResults || commandPalette.recentSearches.length > 0 ? (
                      <div className="py-2">
                        {!commandPalette.query.trim() &&
                          commandPalette.recentSearches.length > 0 && (
                            <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                              <Clock className="mr-1 inline h-3 w-3" />
                              {t('recent')}
                            </p>
                          )}
                        {(commandPalette.hasResults
                          ? commandPalette.results
                          : commandPalette.recentSearches
                        ).map((result, index) => (
                          <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => commandPalette.selectItem(index)}
                            onMouseEnter={() => {
                              /* Keyboard navigation handles this */
                            }}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                              index === commandPalette.selectedIndex
                                ? 'bg-[var(--primary)] bg-opacity-10'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div
                              className={`rounded-lg p-2 ${
                                index === commandPalette.selectedIndex
                                  ? 'bg-[var(--primary)] bg-opacity-20 text-[var(--primary)]'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {getIcon(result.type as SearchResult['type'])}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-medium text-gray-900">{result.title}</p>
                                <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                                  {getTypeLabel(result.type as SearchResult['type'])}
                                </span>
                                {result.meta && (
                                  <span className="flex-shrink-0 rounded-full bg-[var(--status-warning-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-warning)]">
                                    {result.meta}
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-sm text-gray-500">{result.subtitle}</p>
                            </div>
                            <ArrowRight
                              className={`h-4 w-4 flex-shrink-0 ${
                                index === commandPalette.selectedIndex
                                  ? 'text-[var(--primary)]'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    ) : commandPalette.query.trim() && !commandPalette.isLoading ? (
                      <div className="py-12 text-center">
                        <Search className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                        <p className="text-gray-500">{t('noResults')}</p>
                        <p className="text-sm text-gray-400">{t('tryOther')}</p>
                      </div>
                    ) : !commandPalette.query.trim() &&
                      commandPalette.recentSearches.length === 0 ? (
                      <div className="py-12 text-center">
                        <Search className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                        <p className="text-gray-500">{t('startSearch')}</p>
                      </div>
                    ) : null}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <kbd className="rounded border bg-white px-1.5 py-0.5 shadow-sm">↑↓</kbd>
                        {t('footer.navigate')}
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="rounded border bg-white px-1.5 py-0.5 shadow-sm">↵</kbd>
                        {t('footer.select')}
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="rounded border bg-white px-1.5 py-0.5 shadow-sm">esc</kbd>
                        {t('footer.close')}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  )
}
