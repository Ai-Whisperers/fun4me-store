'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { RefreshCw, Plus, Package, ChevronRight, Loader2, ShoppingBag } from 'lucide-react'
import { useCart } from '@/context/cart-context'

interface ReorderProduct {
  id: string
  name: string
  image_url: string | null
  base_price: number
  sale_price: number | null
  stock_quantity: number
  is_available: boolean
  last_ordered_at: string
  total_times_ordered: number
}

interface BuyAgainSectionProps {
  maxItems?: number
}

export default function BuyAgainSection({ maxItems = 4 }: BuyAgainSectionProps) {
  const { clinic } = useParams() as { clinic: string }
  const { addItem } = useCart()

  const [products, setProducts] = useState<ReorderProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchReorderSuggestions = async () => {
      try {
        const res = await fetch(
          `/api/store/reorder-suggestions?clinic=${clinic}&limit=${maxItems + 2}`
        )

        if (res.status === 401) {
          // User not logged in - don't show section
          setProducts([])
          return
        }

        if (!res.ok) {
          throw new Error('Error al cargar sugerencias')
        }

        const data = await res.json()
        setProducts(data.products || [])
      } catch (e) {
        // Client-side error logging - only in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching reorder suggestions:', e)
        }
        setError(e instanceof Error ? e.message : 'Error')
      } finally {
        setLoading(false)
      }
    }

    fetchReorderSuggestions()
  }, [clinic, maxItems])

  const handleAddToCart = async (product: ReorderProduct) => {
    setAddingId(product.id)

    try {
      const result = addItem({
        id: product.id,
        name: product.name,
        price: product.sale_price || product.base_price,
        type: 'product',
        image_url: product.image_url || undefined,
        stock: product.stock_quantity,
      })

      if (result.success) {
        setAddedIds((prev) => new Set(prev).add(product.id))
        setTimeout(() => {
          setAddedIds((prev) => {
            const next = new Set(prev)
            next.delete(product.id)
            return next
          })
        }, 2000)
      }
    } catch (e) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error adding to cart:', e)
      }
    } finally {
      setAddingId(null)
    }
  }

  const formatPrice = (price: number): string => {
    return `Gs ${price.toLocaleString('es-PY')}`
  }

  // Show skeleton during loading
  if (loading) {
    return (
      <section className="border-b border-[var(--border-light)] bg-[var(--bg-default)]">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-[var(--bg-muted)]" />
            <div className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-[var(--bg-muted)]" />
              <div className="h-4 w-48 animate-pulse rounded bg-[var(--bg-muted)]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-subtle)] p-4">
                <div className="mb-3 aspect-square animate-pulse rounded-lg bg-[var(--bg-muted)]" />
                <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-[var(--bg-muted)]" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--bg-muted)]" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Don't show section if error or no products
  if (error || products.length === 0) {
    return null
  }

  const displayProducts = products.slice(0, maxItems)

  return (
    <section className="border-b border-[var(--border-light)] bg-[var(--bg-default)]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--primary)]/10 flex h-10 w-10 items-center justify-center rounded-xl">
              <RefreshCw className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Comprar de Nuevo</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Productos de tus pedidos anteriores
              </p>
            </div>
          </div>
          <Link
            href={`/${clinic}/store/orders`}
            className="flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
          >
            Ver Pedidos
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {displayProducts.map((product) => (
            <div
              key={product.id}
              className="hover:border-[var(--primary)]/30 rounded-xl border border-[var(--border-light)] bg-[var(--bg-subtle)] p-4 transition-colors"
            >
              {/* Product Image */}
              <Link href={`/${clinic}/store/product/${product.id}`} className="mb-3 block">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-white">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-contain p-2"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-8 w-8 text-[var(--text-muted)]" />
                    </div>
                  )}
                  {!product.is_available && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="rounded bg-[var(--status-error)] px-2 py-1 text-xs font-medium text-white">
                        Sin Stock
                      </span>
                    </div>
                  )}
                </div>
              </Link>

              {/* Product Info */}
              <Link href={`/${clinic}/store/product/${product.id}`} className="block">
                <h3 className="mb-1 line-clamp-2 text-sm font-medium text-[var(--text-primary)] hover:text-[var(--primary)]">
                  {product.name}
                </h3>
              </Link>

              <div className="mt-2 flex items-center justify-between">
                <div>
                  {product.sale_price ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--primary)]">
                        {formatPrice(product.sale_price)}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] line-through">
                        {formatPrice(product.base_price)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {formatPrice(product.base_price)}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={!product.is_available || addingId === product.id}
                  className={`rounded-lg p-2 transition-all ${
                    addedIds.has(product.id)
                      ? 'bg-[var(--status-success)] text-white'
                      : product.is_available
                        ? 'bg-[var(--primary)] text-white hover:opacity-90'
                        : 'cursor-not-allowed bg-[var(--bg-muted)] text-[var(--text-muted)]'
                  }`}
                  title={product.is_available ? 'Agregar al carrito' : 'Sin stock'}
                  aria-label={
                    product.is_available
                      ? `Agregar ${product.name} al carrito`
                      : `${product.name} sin stock`
                  }
                >
                  {addingId === product.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : addedIds.has(product.id) ? (
                    <ShoppingBag className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
