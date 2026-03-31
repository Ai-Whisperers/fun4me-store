'use client'

import { Heart, ShoppingCart, Check, Loader2 } from 'lucide-react'
import type { ActionButtonsProps } from './types'

export function ActionButtons({
  inStock,
  addingToCart,
  addedToCart,
  productIsWishlisted,
  togglingWishlist,
  onAddToCart,
  onWishlistToggle,
}: ActionButtonsProps): React.ReactElement {
  return (
    <div className="mb-6 flex gap-3">
      <button
        onClick={onAddToCart}
        disabled={!inStock || addingToCart}
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold transition-all ${
          inStock
            ? addedToCart
              ? 'bg-[var(--status-success)] text-white'
              : 'bg-[var(--primary)] text-white hover:opacity-90'
            : 'cursor-not-allowed bg-gray-100 text-gray-400'
        }`}
      >
        {addingToCart ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : addedToCart ? (
          <>
            <Check className="h-5 w-5" />
            Agregado
          </>
        ) : (
          <>
            <ShoppingCart className="h-5 w-5" />
            Agregar al Carrito
          </>
        )}
      </button>

      <button
        onClick={onWishlistToggle}
        disabled={togglingWishlist}
        className={`rounded-xl border p-3 transition-colors ${
          productIsWishlisted
            ? 'border-red-200 bg-red-50 text-red-500'
            : 'border-[var(--border-default)] text-gray-500 hover:border-red-200 hover:text-red-500'
        } disabled:opacity-50`}
        aria-label={productIsWishlisted ? 'Quitar de lista de deseos' : 'Agregar a lista de deseos'}
      >
        {togglingWishlist ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Heart className={`h-5 w-5 ${productIsWishlisted ? 'fill-current' : ''}`} />
        )}
      </button>
    </div>
  )
}
