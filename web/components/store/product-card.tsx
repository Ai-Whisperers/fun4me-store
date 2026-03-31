'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  Heart,
  ShoppingCart,
  Star,
  Eye,
  Sparkles,
  Trophy,
  Percent,
  Loader2,
  Check,
  Truck,
  AlertCircle,
  ImageIcon,
} from 'lucide-react'
import type { ProductListItem } from '@/lib/types/store'
import { useCart } from '@/context/cart-context'
import { useWishlist } from '@/context/wishlist-context'
import { NotifyWhenAvailable } from './notify-when-available'

/**
 * Props for the unified ProductCard component
 */
export interface ProductCardProps {
  /** Product data */
  product: ProductListItem
  /** Clinic slug for routing */
  clinic: string
  /** Card variant - 'minimal' shows basic info, 'full' shows all features */
  variant?: 'minimal' | 'full'
  /** Currency symbol (default: 'Gs') */
  currencySymbol?: string
  /** Show wishlist button (default: true for 'full' variant) */
  showWishlist?: boolean
  /** Show quick view button on hover (default: true for 'full' variant) */
  showQuickView?: boolean
  /** Show ratings/reviews (default: true for 'full' variant) */
  showRatings?: boolean
  /** Show brand name (default: true for 'full' variant) */
  showBrand?: boolean
  /** Show loyalty points info (default: true for 'full' variant) */
  showLoyaltyPoints?: boolean
  /** Show quantity selector (default: true for 'minimal' variant) */
  showQuantitySelector?: boolean
  /** Callback for quick view action */
  onQuickView?: (product: ProductListItem) => void
}

/**
 * Unified ProductCard component that replaces both ProductCard and EnhancedProductCard.
 * Use variant='minimal' for simple listings, variant='full' for feature-rich display.
 *
 * @example
 * ```tsx
 * // Minimal variant (simple listing)
 * <ProductCard product={product} clinic="terrapet" variant="minimal" />
 *
 * // Full variant (with wishlist, quick view, ratings)
 * <ProductCard
 *   product={product}
 *   clinic="terrapet"
 *   variant="full"
 *   onQuickView={(p) => setQuickViewProduct(p)}
 * />
 *
 * // Custom feature selection
 * <ProductCard
 *   product={product}
 *   clinic="terrapet"
 *   showWishlist={false}
 *   showQuickView={true}
 *   showRatings={true}
 * />
 * ```
 */
export function ProductCard({
  product,
  clinic,
  variant = 'full',
  currencySymbol = 'Gs',
  showWishlist,
  showQuickView,
  showRatings,
  showBrand,
  showLoyaltyPoints,
  showQuantitySelector,
  onQuickView,
}: ProductCardProps): React.ReactElement {
  const t = useTranslations('store')

  // Determine feature visibility based on variant (can be overridden by explicit props)
  const isMinimal = variant === 'minimal'
  const displayWishlist = showWishlist ?? !isMinimal
  const displayQuickView = showQuickView ?? (!isMinimal && !!onQuickView)
  const displayRatings = showRatings ?? !isMinimal
  const displayBrand = showBrand ?? !isMinimal
  const displayLoyaltyPoints = showLoyaltyPoints ?? !isMinimal
  const displayQuantitySelector = showQuantitySelector ?? isMinimal

  // Hooks
  const { addItem } = useCart()
  const { isWishlisted, toggleWishlist } = useWishlist()

  // Local state
  const [isHovered, setIsHovered] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [togglingWishlist, setTogglingWishlist] = useState(false)
  const [quantity, setQuantity] = useState(1)

  // Derived values
  const productIsWishlisted = isWishlisted(product.id)
  // Support both direct stock_quantity and nested inventory.stock_quantity
  const stock = product.stock_quantity ?? product.inventory?.stock_quantity ?? 0
  const inStock = stock > 0
  const lowStock = stock > 0 && stock <= 5

  // Formatters
  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return `${currencySymbol} 0`
    return `${currencySymbol} ${price.toLocaleString('es-PY')}`
  }

  // Handlers
  const handleAddToCart = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()

    if (!inStock || addingToCart) return

    setAddingToCart(true)

    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.current_price,
        type: 'product',
        image_url: product.image_url || undefined,
        description: product.short_description || undefined,
        stock,
        sku: product.sku || undefined,
      },
      displayQuantitySelector ? quantity : 1
    )

    setTimeout(() => {
      setAddingToCart(false)
      setAddedToCart(true)
      setTimeout(() => setAddedToCart(false), 2000)
    }, 300)
  }

  const handleWishlistToggle = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    if (togglingWishlist) return

    setTogglingWishlist(true)
    try {
      await toggleWishlist(product.id)
    } finally {
      setTogglingWishlist(false)
    }
  }

  const handleQuickView = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    onQuickView?.(product)
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(e.target.value, 10) || 1
    setQuantity(Math.max(1, Math.min(stock, value)))
  }

  return (
    <Link
      href={`/${clinic}/store/product/${product.id}`}
      className="hover:border-[var(--primary)]/30 group block overflow-hidden rounded-xl border border-[var(--border-default)] bg-white transition-all duration-300 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {/* Wishlist Button */}
        {displayWishlist && (
          <button
            onClick={handleWishlistToggle}
            disabled={togglingWishlist}
            className={`absolute right-3 top-3 z-10 rounded-full p-2 transition-all ${
              productIsWishlisted
                ? 'bg-red-50 text-red-500'
                : 'bg-white/80 text-gray-400 backdrop-blur hover:text-red-500'
            } shadow-sm disabled:opacity-50`}
            aria-label={
              productIsWishlisted ? t('removeFromWishlist') : t('addToWishlist')
            }
          >
            {togglingWishlist ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Heart className={`h-5 w-5 ${productIsWishlisted ? 'fill-current' : ''}`} />
            )}
          </button>
        )}

        {/* Badges */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          {product.has_discount && product.discount_percentage && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">
              <Percent className="h-3 w-3" />-{product.discount_percentage}%
            </span>
          )}
          {product.is_new_arrival && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-2 py-1 text-xs font-bold text-white">
              <Sparkles className="h-3 w-3" />
              {t('newArrival')}
            </span>
          )}
          {product.is_best_seller && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-xs font-bold text-white">
              <Trophy className="h-3 w-3" />
              {t('bestSeller')}
            </span>
          )}
          {/* Category badge for minimal variant */}
          {isMinimal && product.category && (
            <span className="rounded-lg border border-gray-100 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-gray-800 shadow-sm backdrop-blur-sm">
              {product.category.name}
            </span>
          )}
        </div>

        {/* Low stock badge for minimal variant */}
        {isMinimal && lowStock && (
          <div className="absolute bottom-4 left-4 z-10 rounded-lg bg-orange-500 px-2.5 py-1 text-[10px] font-black uppercase text-white shadow-sm">
            {t('lastUnitsLong', { count: stock })}
          </div>
        )}

        {/* Product Image */}
        <div className="relative h-full w-full">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className={`object-contain p-4 transition-transform duration-300 ${
                isHovered ? 'scale-110' : 'scale-100'
              }`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <ImageIcon className="h-12 w-12" />
            </div>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {!inStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <span className="flex items-center gap-2 rounded-full bg-gray-800 px-4 py-2 text-sm font-medium text-white">
              <AlertCircle className="h-4 w-4" />
              {isMinimal ? t('outOfStock') : t('noStock')}
            </span>
          </div>
        )}

        {/* Quick View Button */}
        {displayQuickView && isHovered && inStock && onQuickView && (
          <button
            onClick={handleQuickView}
            className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium shadow-lg backdrop-blur transition-colors hover:bg-white"
          >
            <Eye className="h-4 w-4" />
            {t('quickView')}
          </button>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Brand */}
        {displayBrand && product.brand && (
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
            {product.brand.name}
          </span>
        )}

        {/* Name */}
        <h3
          className={`line-clamp-2 font-medium text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)] ${
            displayBrand ? 'mt-1' : ''
          } ${isMinimal ? 'text-xl font-bold' : 'min-h-[2.5rem]'}`}
        >
          {product.name}
        </h3>

        {/* Quantity Selector (minimal variant) */}
        {displayQuantitySelector && inStock && (
          <div className="my-3 flex w-fit items-center gap-3 rounded-2xl bg-gray-50 p-2">
            <span className="pl-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
              {t('quantityShort')}
            </span>
            <input
              type="number"
              min="1"
              max={stock}
              value={quantity}
              onChange={handleQuantityChange}
              onClick={(e) => e.preventDefault()}
              className="w-12 bg-transparent text-center font-bold text-gray-800 focus:outline-none"
            />
          </div>
        )}

        {/* Description (minimal variant) */}
        {isMinimal && product.short_description && (
          <p className="mb-4 line-clamp-2 text-sm text-gray-500">{product.short_description}</p>
        )}

        {/* Rating */}
        {displayRatings && (product.review_count ?? 0) > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(product.avg_rating ?? 0)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {(product.avg_rating ?? 0).toFixed(1)} ({product.review_count ?? 0})
            </span>
          </div>
        )}

        {/* Price */}
        <div className={`${displayRatings || displayQuantitySelector ? 'mt-3' : 'mt-2'}`}>
          <div className="flex flex-wrap items-baseline gap-2">
            <span
              className={`font-black text-[var(--text-primary)] ${isMinimal ? 'text-2xl' : 'text-xl'}`}
            >
              {formatPrice(product.current_price)}
            </span>
            {product.original_price && product.original_price > product.current_price && (
              <span className="text-sm text-[var(--text-muted)] line-through">
                {formatPrice(product.original_price)}
              </span>
            )}
          </div>
        </div>

        {/* Stock Status */}
        {!isMinimal && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {inStock ? (
              lowStock ? (
                <span className="flex items-center gap-1 font-semibold text-[var(--status-warning)]">
                  <AlertCircle className="h-3 w-3" />
                  {t('lastUnits', { count: stock })}
                </span>
              ) : (
                <span className="flex items-center gap-1 font-medium text-[var(--status-success)]">
                  <Truck className="h-3.5 w-3.5" />
                  {t('shippingAvailable')}
                </span>
              )
            ) : (
              <span className="flex items-center gap-1 font-semibold text-[var(--status-error)]">
                <AlertCircle className="h-3 w-3" />
                {t('noStock')}
              </span>
            )}
          </div>
        )}

        {/* Add to Cart Button or Notify Component */}
        {inStock ? (
          <button
            onClick={handleAddToCart}
            disabled={addingToCart}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition-all ${
              addedToCart
                ? 'bg-[var(--status-success)] text-white shadow-md'
                : 'bg-[var(--primary)] text-white hover:scale-[1.02] hover:shadow-md active:scale-[0.98]'
            }`}
          >
            {addingToCart ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : addedToCart ? (
              <>
                <Check className="h-4 w-4" />
                {t('added')}
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                {isMinimal ? t('add') : t('addToCart')}
              </>
            )}
          </button>
        ) : (
          <div className="mt-3" onClick={(e) => e.preventDefault()}>
            <NotifyWhenAvailable productId={product.id} clinic={clinic} variant="inline" />
          </div>
        )}

        {/* Loyalty Points */}
        {displayLoyaltyPoints && inStock && product.current_price > 10000 && (
          <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-[var(--text-muted)]">
            <Sparkles className="h-3 w-3 text-amber-500" />
            {t('earnPoints', { count: Math.floor(product.current_price / 10000) })}
          </p>
        )}
      </div>
    </Link>
  )
}

// Re-export as default for backwards compatibility with EnhancedProductCard imports
export default ProductCard
