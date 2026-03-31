'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Star, Sparkles, Trophy } from 'lucide-react'

interface RelatedProduct {
  relation_type: string
  product: {
    id: string
    name: string
    short_description: string | null
    image_url: string | null
    base_price: number
    avg_rating: number
    review_count: number
    is_new_arrival: boolean
    is_best_seller: boolean
    store_inventory: { stock_quantity: number } | null
  }
}

interface Props {
  products: RelatedProduct[]
  clinic: string
  currencySymbol: string
}

export default function RelatedProducts({ products, clinic, currencySymbol }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return `${currencySymbol} 0`
    return `${currencySymbol} ${price.toLocaleString('es-PY')}`
  }

  // Group products by relation type
  const similarProducts = products.filter((p) => p.relation_type === 'similar')
  const complementaryProducts = products.filter(
    (p) => p.relation_type === 'complementary' || p.relation_type === 'accessory'
  )
  const frequentlyBought = products.filter((p) => p.relation_type === 'frequently_bought')

  const renderProductCard = (item: RelatedProduct) => {
    const p = item.product
    const inStock = (p.store_inventory?.stock_quantity || 0) > 0

    return (
      <Link
        key={p.id}
        href={`/${clinic}/store/product/${p.id}`}
        className="group w-64 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--border-default)] bg-white transition-shadow hover:shadow-lg"
      >
        <div className="relative aspect-square bg-gray-50">
          {/* Badges */}
          <div className="absolute left-2 top-2 z-10 flex flex-col gap-1">
            {p.is_new_arrival && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
                <Sparkles className="h-3 w-3" />
                Nuevo
              </span>
            )}
            {p.is_best_seller && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                <Trophy className="h-3 w-3" />
                Top
              </span>
            )}
          </div>

          <Image
            src={p.image_url || '/placeholder-product.svg'}
            alt={p.name}
            fill
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
            sizes="256px"
          />

          {!inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <span className="rounded-full bg-gray-800 px-3 py-1 text-sm font-medium text-white">
                Sin Stock
              </span>
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="line-clamp-2 font-medium text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
            {p.name}
          </h3>

          {p.review_count > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-[var(--text-secondary)]">
                {p.avg_rating.toFixed(1)} ({p.review_count})
              </span>
            </div>
          )}

          <p className="mt-2 text-lg font-bold text-[var(--text-primary)]">
            {formatPrice(p.base_price)}
          </p>
        </div>
      </Link>
    )
  }

  const renderSection = (title: string, items: RelatedProduct[]) => {
    if (items.length === 0) return null

    return (
      <div className="mb-8 last:mb-0">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="rounded-full border border-[var(--border-default)] p-2 transition-colors hover:bg-[var(--bg-subtle)]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="rounded-full border border-[var(--border-default)] p-2 transition-colors hover:bg-[var(--bg-subtle)]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="scrollbar-hide flex gap-4 overflow-x-auto pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map(renderProductCard)}
        </div>
      </div>
    )
  }

  return (
    <div>
      {renderSection('Productos Similares', similarProducts)}
      {renderSection('Complementá tu Compra', complementaryProducts)}
      {renderSection('Frecuentemente Comprados Juntos', frequentlyBought)}

      {/* If no grouped products, show all */}
      {similarProducts.length === 0 &&
        complementaryProducts.length === 0 &&
        frequentlyBought.length === 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                También te Puede Interesar
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => scroll('left')}
                  className="rounded-full border border-[var(--border-default)] p-2 transition-colors hover:bg-[var(--bg-subtle)]"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => scroll('right')}
                  className="rounded-full border border-[var(--border-default)] p-2 transition-colors hover:bg-[var(--bg-subtle)]"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="scrollbar-hide flex gap-4 overflow-x-auto pb-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {products.map(renderProductCard)}
            </div>
          </div>
        )}
    </div>
  )
}
