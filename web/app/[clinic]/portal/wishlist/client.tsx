'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import { ShoppingCart, Trash2, Bell, Check, AlertCircle, Loader2 } from 'lucide-react'
import { useWishlist } from '@/context/wishlist-context'
import { useCart } from '@/context/cart-context'
import { formatPriceGs } from '@/lib/utils/pet-size'

interface WishlistProduct {
  id: string
  wishlistId: string
  name: string
  sku: string
  description: string
  price: number
  originalPrice?: number
  imageUrl: string | null
  isActive: boolean
  inStock: boolean
  stockQuantity: number
  addedAt: string
}

interface WishlistClientProps {
  clinic: string
  initialProducts: WishlistProduct[]
}

export function WishlistClient({ clinic, initialProducts }: WishlistClientProps) {
  const { removeFromWishlist, isLoading: wishlistLoading } = useWishlist()
  const { addItem } = useCart()
  const [products, setProducts] = useState(initialProducts)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [addingToCartIds, setAddingToCartIds] = useState<Set<string>>(new Set())
  const [notifyingIds, setNotifyingIds] = useState<Set<string>>(new Set())
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set())

  const handleRemove = async (productId: string) => {
    setRemovingIds((prev) => new Set(prev).add(productId))
    try {
      await removeFromWishlist(productId)
      setProducts((prev) => prev.filter((p) => p.id !== productId))
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  const handleAddToCart = async (product: WishlistProduct) => {
    setAddingToCartIds((prev) => new Set(prev).add(product.id))
    try {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        type: 'product',
        image_url: product.imageUrl ?? undefined,
        stock: product.stockQuantity,
      })
      // Brief delay for UX feedback
      await new Promise((resolve) => setTimeout(resolve, 300))
    } finally {
      setAddingToCartIds((prev) => {
        const next = new Set(prev)
        next.delete(product.id)
        return next
      })
    }
  }

  const handleAddAllToCart = async () => {
    const inStockProducts = products.filter((p) => p.inStock && p.isActive)
    for (const product of inStockProducts) {
      await handleAddToCart(product)
    }
  }

  const handleNotifyWhenAvailable = async (productId: string) => {
    setNotifyingIds((prev) => new Set(prev).add(productId))
    try {
      const response = await fetch('/api/store/stock-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })

      if (response.ok) {
        setNotifiedIds((prev) => new Set(prev).add(productId))
      }
    } catch (error) {
      logger.error('Error subscribing to stock alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: productId
      })
    } finally {
      setNotifyingIds((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  const inStockCount = products.filter((p) => p.inStock && p.isActive).length

  return (
    <div>
      {/* Action Bar */}
      {inStockCount > 0 && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleAddAllToCart}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-bold text-white transition hover:brightness-110"
          >
            <ShoppingCart className="h-4 w-4" />
            Agregar todo al carrito ({inStockCount})
          </button>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <div
            key={product.id}
            className={`overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md ${
              !product.isActive ? 'opacity-60' : ''
            }`}
          >
            {/* Image */}
            <div className="relative aspect-square bg-gray-100">
              {product.imageUrl ? (
                <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ShoppingCart className="h-12 w-12 text-gray-300" />
                </div>
              )}

              {/* Status Badge */}
              {!product.isActive ? (
                <span className="absolute left-2 top-2 rounded bg-gray-500 px-2 py-1 text-xs font-bold text-white">
                  No disponible
                </span>
              ) : !product.inStock ? (
                <span className="absolute left-2 top-2 rounded bg-red-500 px-2 py-1 text-xs font-bold text-white">
                  Agotado
                </span>
              ) : product.originalPrice ? (
                <span className="absolute left-2 top-2 rounded bg-green-500 px-2 py-1 text-xs font-bold text-white">
                  Oferta
                </span>
              ) : null}

              {/* Remove Button */}
              <button
                onClick={() => handleRemove(product.id)}
                disabled={removingIds.has(product.id)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
                aria-label="Eliminar de lista de deseos"
              >
                {removingIds.has(product.id) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <Link
                href={`/${clinic}/store/products/${product.id}`}
                className="mb-2 block transition hover:text-[var(--primary)]"
              >
                <h3 className="line-clamp-2 font-bold text-[var(--text-primary)]">
                  {product.name}
                </h3>
              </Link>

              {product.description && (
                <p className="mb-3 line-clamp-2 text-sm text-[var(--text-muted)]">
                  {product.description}
                </p>
              )}

              {/* Price */}
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-lg font-black text-[var(--primary)]">
                  {formatPriceGs(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-[var(--text-muted)] line-through">
                    {formatPriceGs(product.originalPrice)}
                  </span>
                )}
              </div>

              {/* Actions */}
              {product.isActive && product.inStock ? (
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={addingToCartIds.has(product.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {addingToCartIds.has(product.id) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Agregando...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      Agregar al carrito
                    </>
                  )}
                </button>
              ) : product.isActive && !product.inStock ? (
                notifiedIds.has(product.id) ? (
                  <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 font-medium text-green-700">
                    <Check className="h-4 w-4" />
                    Te notificaremos
                  </div>
                ) : (
                  <button
                    onClick={() => handleNotifyWhenAvailable(product.id)}
                    disabled={notifyingIds.has(product.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                  >
                    {notifyingIds.has(product.id) ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4" />
                        Notificarme
                      </>
                    )}
                  </button>
                )
              ) : (
                <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 font-medium text-gray-500">
                  <AlertCircle className="h-4 w-4" />
                  No disponible
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
