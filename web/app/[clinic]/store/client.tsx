'use client'

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ArrowLeft,
  Search,
  ShoppingBag,
  Truck,
  SlidersHorizontal,
  Loader2,
  AlertCircle,
  PackageSearch,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  BadgePercent,
  X,
} from 'lucide-react'
import type { ClinicConfig } from '@/lib/clinics'
import type {
  ProductFilters,
  AvailableFilters,
  ProductListItem,
  SortOption,
  ProductListResponse,
  Species,
} from '@/lib/types/store'
import { SPECIES } from '@/lib/types/store'
import SortDropdown from '@/components/store/filters/sort-dropdown'
import FilterChips from '@/components/store/filters/filter-chips'
import { ProductCard } from '@/components/store/product-card'

// Lazy load heavy components to reduce initial bundle size

const LazyFilterSidebar = lazy(() =>
  import('@/components/store/filters/filter-sidebar').then((mod) => ({ default: mod.default }))
)
const LazyFilterDrawer = lazy(() =>
  import('@/components/store/filters/filter-drawer').then((mod) => ({ default: mod.default }))
)
const LazyQuickViewModal = lazy(() =>
  import('@/components/store/quick-view-modal').then((mod) => ({ default: mod.default }))
)

// Dynamically import components that aren't needed immediately
import { useCart } from '@/context/cart-context'
import BuyAgainSection from '@/components/store/buy-again-section'

const queryClient = new QueryClient()

export default function StorePageClientWrapper(props: StorePageClientProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <StorePageClient {...props} />
    </QueryClientProvider>
  )
}

interface StorePageClientProps {
  readonly config: ClinicConfig
  readonly heroImage?: string | null
  readonly initialProductData?: ProductListResponse
}

const DEFAULT_FILTERS: ProductFilters = {}

const DEFAULT_AVAILABLE_FILTERS: AvailableFilters = {
  categories: [],
  subcategories: [],
  brands: [],
  species: SPECIES.map((s) => ({ value: s, label: s, count: 0 })),
  life_stages: [],
  breed_sizes: [],
  health_conditions: [],
  price_range: { min: 0, max: 1000000 },
}

function StorePageClient({ config, heroImage, initialProductData }: StorePageClientProps) {
  const t = useTranslations('store')
  const { clinic } = useParams() as { clinic: string }
  const searchParams = useSearchParams()
  const labels = config.ui_labels?.store || {}
  const { items: cartItems } = useCart()

  // Filter state
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<ProductFilters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<SortOption>('relevance')
  const [page, setPage] = useState(1)

  // UI state
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [quickViewProduct, setQuickViewProduct] = useState<ProductListItem | null>(null)

  const {
    data: productData,
    error,
    isLoading: loading,
  } = useQuery<ProductListResponse>({
    queryKey: ['products', clinic, page, sort, debouncedSearch, filters],
    queryFn: async () => {
      // Use public API - no auth required for browsing products
      const params = new URLSearchParams({
        clinic,
        page: String(page),
        limit: '12',
        sort,
      })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (filters.category) params.set('category', filters.category)
      if (filters.brand) params.set('brand', filters.brand)
      if (filters.species?.length) {
        filters.species.forEach((s) => params.append('species', s))
      }

      const response = await fetch(`/api/store/products?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || t('loadErrorProducts'))
      }
      return response.json()
    },
    initialData: initialProductData,
  })

  const {
    products = [],
    pagination: { pages: totalPages = 1, total: totalProducts = 0 } = {},
    filters: { available: availableFilters = DEFAULT_AVAILABLE_FILTERS } = {},
  } = productData || {}

  const cartItemCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems]
  )

  // Initialize filters from URL
  useEffect(() => {
    const initialFilters: ProductFilters = {}

    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const search = searchParams.get('q')
    const species = searchParams.get('species')

    if (category) initialFilters.category = category
    if (brand) initialFilters.brand = brand
    if (search) {
      initialFilters.search = search
      setSearchInput(search)
      setDebouncedSearch(search)
    }
    if (species) initialFilters.species = species.split(',') as Species[]

    if (Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters)
      setPendingFilters(initialFilters)
    }
  }, [searchParams])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Handlers
  const handleFiltersChange = useCallback((newFilters: ProductFilters) => {
    setPendingFilters(newFilters)
    // For desktop sidebar, apply immediately
    setFilters(newFilters)
    setPage(1)
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setPendingFilters(DEFAULT_FILTERS)
    setSearchInput('')
    setDebouncedSearch('')
    setPage(1)
  }, [])

  const handleRemoveFilter = useCallback((key: keyof ProductFilters, value?: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev }

      if (value && Array.isArray(prev[key])) {
        const arrayValue = prev[key] as string[]
        const filtered = arrayValue.filter((v) => v !== value)
        if (filtered.length > 0) {
          ;(newFilters[key] as string[]) = filtered
        } else {
          delete newFilters[key]
        }
      } else if (key === 'price_min') {
        delete newFilters.price_min
        delete newFilters.price_max
      } else {
        delete newFilters[key]
      }

      return newFilters
    })
    setPendingFilters((prev) => {
      const newFilters = { ...prev }
      if (value && Array.isArray(prev[key])) {
        const arrayValue = prev[key] as string[]
        const filtered = arrayValue.filter((v) => v !== value)
        if (filtered.length > 0) {
          ;(newFilters[key] as string[]) = filtered
        } else {
          delete newFilters[key]
        }
      } else if (key === 'price_min') {
        delete newFilters.price_min
        delete newFilters.price_max
      } else {
        delete newFilters[key]
      }
      return newFilters
    })
    setPage(1)
  }, [])

  const handleApplyMobileFilters = useCallback(() => {
    setFilters(pendingFilters)
    setPage(1)
  }, [pendingFilters])

  const handleSortChange = useCallback((newSort: SortOption) => {
    setSort(newSort)
    setPage(1)
  }, [])

  const handleQuickView = useCallback((product: ProductListItem) => {
    setQuickViewProduct(product)
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setDebouncedSearch(searchInput)
    setPage(1)
  }

  if (!clinic) return null

  // Loading state
  if (loading && !products.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-subtle)]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-[var(--primary)]" />
          <p className="text-[var(--text-secondary)]">{t('loading')}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-subtle)] px-4">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-[var(--status-error)]" />
          <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">{t('loadError')}</h2>
          <p className="mb-6 text-[var(--text-secondary)]">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition-colors hover:bg-[var(--primary-dark)]"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    )
  }

  const hasActiveFilters = Object.keys(filters).length > 0 || debouncedSearch

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-default)] shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Link
            href={`/${clinic}`}
            className="flex flex-shrink-0 items-center gap-2 font-bold text-[var(--primary)] transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">{labels.back_home || t('back')}</span>
          </Link>

          {/* Search - Desktop */}
          <form onSubmit={handleSearchSubmit} className="relative hidden max-w-md flex-1 md:block">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder={labels.search_placeholder || t('searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-full border-none bg-[var(--bg-subtle)] py-2.5 pl-12 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--primary)]"
            />
          </form>

          <Link
            href={`/${clinic}/cart`}
            className="relative flex-shrink-0 rounded-full p-2 transition hover:bg-[var(--bg-subtle)]"
          >
            <ShoppingBag className="h-6 w-6 text-[var(--text-secondary)]" />
            {cartItemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
                {cartItemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {heroImage ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${heroImage}')` }}
            />
            <div className="from-[var(--primary)]/90 via-[var(--primary)]/70 to-[var(--primary)]/50 absolute inset-0 bg-gradient-to-r" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] via-[var(--primary-dark)] to-[var(--primary)]" />
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
          </>
        )}

        <div className="container relative z-10 mx-auto px-4 py-12 md:py-16">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="max-w-xl text-center md:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white/90">
                <Truck className="h-4 w-4" />
                {t('freeDelivery')}
              </div>
              <h1 className="mb-4 text-3xl font-black leading-tight text-white md:text-4xl lg:text-5xl">
                {labels.hero_title || t('heroTitle')}
              </h1>
              <p className="text-base leading-relaxed text-white/90 md:text-lg">
                {labels.hero_subtitle || t('heroSubtitle')}
              </p>
            </div>
            <div className="hidden items-center justify-center lg:flex">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/10">
                <ShoppingBag className="h-16 w-16 text-white/40" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buy Again Section - Only shown for logged in users with purchase history */}
      <BuyAgainSection maxItems={4} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Mobile Search */}
        <form onSubmit={handleSearchSubmit} className="mb-6 block md:hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={labels.search_placeholder || t('searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 shadow-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
        </form>

        {/* Mobile Filter Button */}
        <div className="mb-6 flex items-center gap-4 lg:hidden">
          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors hover:bg-gray-50"
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span className="font-medium">{t('filters')}</span>
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
                {Object.keys(filters).length}
              </span>
            )}
          </button>
          <SortDropdown value={sort} onChange={handleSortChange} />
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[280px_1fr]">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:sticky lg:top-24 lg:block">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white p-6" />}>
              <LazyFilterSidebar
                filters={filters}
                availableFilters={availableFilters}
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
              />
            </Suspense>

            {/* Promo Card */}
            <div className="from-[var(--accent)]/10 to-[var(--accent)]/5 border-[var(--accent)]/20 mt-4 rounded-2xl border bg-gradient-to-br p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="bg-[var(--accent)]/20 flex h-10 w-10 items-center justify-center rounded-xl">
                  <BadgePercent className="h-5 w-5 text-[var(--secondary-dark)]" />
                </div>
                <span className="font-bold text-[var(--text-primary)]">{t('offers')}</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {t('promoCode', { percent: '10', code: 'PRIMERA10' })}
              </p>
            </div>
          </div>

          {/* Product Grid */}
          <div>
            {/* Header with Sort */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {filters.category || t('allProducts')}
                </h2>
                {debouncedSearch && (
                  <p className="text-sm text-[var(--text-muted)]">
                    {t('resultsFor', { query: debouncedSearch })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="rounded-full border border-gray-100 bg-white px-4 py-2 text-sm font-medium text-[var(--text-muted)] shadow-sm">
                  {t('productCount', { count: totalProducts })}
                </span>
                <div className="hidden lg:block">
                  <SortDropdown value={sort} onChange={handleSortChange} />
                </div>
              </div>
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
              <div className="mb-6 space-y-2">
                {debouncedSearch && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-muted)]">{t('searchLabel')}</span>
                    <button
                      onClick={() => {
                        setSearchInput('')
                        setDebouncedSearch('')
                      }}
                      className="bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm text-[var(--primary)] transition-colors"
                    >
                      <span>&quot;{debouncedSearch}&quot;</span>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <FilterChips
                  filters={filters}
                  availableFilters={availableFilters}
                  onRemoveFilter={handleRemoveFilter}
                  onClearAll={handleClearFilters}
                />
              </div>
            )}

            {/* Products or Empty State */}
            {products.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                  <PackageSearch className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
                  {t('noProductsFound')}
                </h3>
                <p className="mx-auto mb-6 max-w-md text-[var(--text-secondary)]">
                  {debouncedSearch
                    ? t('noProductsSearch', { query: debouncedSearch })
                    : labels.empty_state || t('noProductsMessage')}
                </p>
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition-colors hover:bg-[var(--primary-dark)]"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('clearFilters')}
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      clinic={clinic}
                      onQuickView={handleQuickView}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)]">
                      {t('pageOf', { page, total: totalPages })}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <Suspense fallback={null}>
        <LazyFilterDrawer
          isOpen={isFilterDrawerOpen}
          onClose={() => setIsFilterDrawerOpen(false)}
          filters={pendingFilters}
          availableFilters={availableFilters}
          onFiltersChange={setPendingFilters}
          onApply={handleApplyMobileFilters}
          onClearFilters={handleClearFilters}
          resultCount={totalProducts}
        />
      </Suspense>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <Suspense fallback={null}>
          <LazyQuickViewModal
            product={quickViewProduct}
            clinic={clinic}
            onClose={() => setQuickViewProduct(null)}
          />
        </Suspense>
      )}
    </div>
  )
}
