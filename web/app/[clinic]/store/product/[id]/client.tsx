'use client'

/**
 * Product Detail Client Component
 *
 * RES-001: Migrated to React Query for data fetching
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import {
  ArrowLeft,
  ShoppingCart,
  Heart,
  Share2,
  Truck,
  Shield,
  RotateCcw,
  Star,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  Minus,
  Plus,
  FileText,
} from 'lucide-react'
import type {
  StoreProductWithDetails,
  ReviewSummary,
} from '@/lib/types/store'
import { useCart } from '@/context/cart-context'
import { useWishlist } from '@/context/wishlist-context'
import ProductGallery from '@/components/store/product-detail/product-gallery'
import ProductTabs from '@/components/store/product-detail/product-tabs'
import RelatedProducts from '@/components/store/product-detail/related-products'
import { SubscribeButton } from '@/components/store/subscribe-button'

interface ProductDetailResponse {
  product: StoreProductWithDetails
  review_summary: ReviewSummary
  related_products: Array<{
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
  }>
  questions: Array<{
    id: string
    question: string
    answer: string
    created_at: string
    user_name: string
    answerer_name: string
    answered_at: string
  }>
}

interface Props {
  clinic: string
  productId: string
  clinicConfig: {
    name: string
    settings?: {
      currency_symbol?: string
    }
  }
}

export default function ProductDetailClient({ clinic, productId, clinicConfig }: Props) {
  const router = useRouter()
  const { addItem, items } = useCart()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [togglingWishlist, setTogglingWishlist] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)

  const productIsWishlisted = isWishlisted(productId)

  const handleWishlistToggle = async () => {
    if (togglingWishlist) return
    setTogglingWishlist(true)
    try {
      await toggleWishlist(productId)
    } finally {
      setTogglingWishlist(false)
    }
  }

  const currencySymbol = clinicConfig.settings?.currency_symbol || 'Gs'

  // React Query: Fetch product details
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch: fetchProduct,
  } = useQuery({
    queryKey: ['store-product', productId, clinic],
    queryFn: async (): Promise<ProductDetailResponse> => {
      const res = await fetch(`/api/store/products/${productId}?clinic=${clinic}`)
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Producto no encontrado')
        }
        throw new Error('Error al cargar el producto')
      }
      const productData = await res.json()

      // Set default variant if exists
      const defaultVariant = productData.product.variants?.find(
        (v: { is_default: boolean }) => v.is_default
      )
      if (defaultVariant && !selectedVariant) {
        setSelectedVariant(defaultVariant.id)
      }

      return productData
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
    enabled: !!productId && !!clinic,
  })

  const error = queryError?.message || null

  const handleAddToCart = async () => {
    if (!data?.product) return

    setAddingToCart(true)
    const product = data.product
    const variant = selectedVariant ? product.variants.find((v) => v.id === selectedVariant) : null

    const price = variant ? product.current_price + variant.price_modifier : product.current_price

    addItem(
      {
        id: variant ? `${product.id}-${variant.id}` : product.id,
        name: variant ? `${product.name} - ${variant.name}` : product.name,
        price,
        type: 'product',
        image_url: product.image_url || undefined,
        description: product.short_description || undefined,
        stock: variant ? variant.stock_quantity : product.inventory?.stock_quantity || 0,
        variant_id: variant?.id,
        sku: variant?.sku || product.sku || undefined,
      },
      quantity
    )

    setAddingToCart(false)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta
    const maxStock = selectedVariant
      ? data?.product.variants.find((v) => v.id === selectedVariant)?.stock_quantity || 0
      : data?.product.inventory?.stock_quantity || 0

    if (newQty >= 1 && newQty <= Math.min(maxStock, 99)) {
      setQuantity(newQty)
    }
  }

  const formatPrice = (price: number) => {
    return `${currencySymbol} ${price.toLocaleString('es-PY')}`
  }

  const getStock = () => {
    if (selectedVariant) {
      return data?.product.variants.find((v) => v.id === selectedVariant)?.stock_quantity || 0
    }
    return data?.product.inventory?.stock_quantity || 0
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-default)]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[var(--primary)]" />
          <p className="text-[var(--text-secondary)]">Cargando producto...</p>
        </div>
      </div>
    )
  }

  if (error || !data?.product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-default)]">
        <div className="mx-auto max-w-md px-4 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
            {error || 'Producto no encontrado'}
          </h1>
          <p className="mb-6 text-[var(--text-secondary)]">
            El producto que buscas no existe o no está disponible.
          </p>
          {/* UX-004: Retry button */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => fetchProduct()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--primary)] px-6 py-3 text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
            >
              <RotateCcw className="h-4 w-4" />
              Reintentar
            </button>
            <Link
              href={`/${clinic}/store`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-white transition-opacity hover:opacity-90"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a la tienda
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const product = data.product
  const stock = getStock()
  const inStock = stock > 0
  const lowStock = stock > 0 && stock <= 5

  const currentPrice = selectedVariant
    ? product.current_price +
      (product.variants.find((v) => v.id === selectedVariant)?.price_modifier || 0)
    : product.current_price

  const originalPrice = product.original_price
    ? selectedVariant
      ? product.original_price +
        (product.variants.find((v) => v.id === selectedVariant)?.price_modifier || 0)
      : product.original_price
    : null

  return (
    <div className="min-h-screen bg-[var(--bg-default)]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Volver</span>
            </button>

            <Link
              href={`/${clinic}/cart`}
              className="relative rounded-full p-2 transition-colors hover:bg-[var(--bg-subtle)]"
            >
              <ShoppingCart className="h-6 w-6 text-[var(--text-primary)]" />
              {items.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className="container mx-auto px-4 py-3">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
          <li>
            <Link href={`/${clinic}/store`} className="hover:text-[var(--primary)]">
              Tienda
            </Link>
          </li>
          {product.category && (
            <>
              <ChevronRight className="h-4 w-4" />
              <li>
                <Link
                  href={`/${clinic}/store?category=${product.category.slug}`}
                  className="hover:text-[var(--primary)]"
                >
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          {product.subcategory && (
            <>
              <ChevronRight className="h-4 w-4" />
              <li>
                <Link
                  href={`/${clinic}/store?subcategory=${product.subcategory.slug}`}
                  className="hover:text-[var(--primary)]"
                >
                  {product.subcategory.name}
                </Link>
              </li>
            </>
          )}
          <ChevronRight className="h-4 w-4" />
          <li className="max-w-[200px] truncate font-medium text-[var(--text-primary)]">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left Column - Gallery */}
          <div>
            <ProductGallery
              images={
                product.images.length > 0
                  ? product.images
                  : [
                      {
                        id: '1',
                        image_url: product.image_url || '/placeholder-product.png',
                        alt_text: product.name,
                        is_primary: true,
                        sort_order: 0,
                        product_id: product.id,
                        tenant_id: product.tenant_id,
                        created_at: '',
                      },
                    ]
              }
              productName={product.name}
              hasDiscount={product.has_discount}
              discountPercentage={product.discount_percentage}
              isNewArrival={product.is_new_arrival}
              isBestSeller={product.is_best_seller}
            />
          </div>

          {/* Right Column - Product Info */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            {/* Brand */}
            {product.brand && (
              <Link
                href={`/${clinic}/store?brand=${product.brand.slug}`}
                className="mb-2 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]"
              >
                {product.brand.logo_url && (
                  <img
                    src={product.brand.logo_url}
                    alt={product.brand.name}
                    className="h-5 w-auto"
                  />
                )}
                <span>{product.brand.name}</span>
              </Link>
            )}

            {/* Title */}
            <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)] lg:text-3xl">
              {product.name}
            </h1>

            {/* Rating */}
            {product.review_count > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(product.avg_rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-[var(--text-secondary)]">
                  {product.avg_rating.toFixed(1)} ({product.review_count} reseñas)
                </span>
              </div>
            )}

            {/* SKU */}
            {product.sku && (
              <p className="mb-4 text-sm text-[var(--text-muted)]">SKU: {product.sku}</p>
            )}

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-[var(--text-primary)]">
                  {formatPrice(currentPrice)}
                </span>
                {originalPrice && (
                  <span className="text-lg text-[var(--text-muted)] line-through">
                    {formatPrice(originalPrice)}
                  </span>
                )}
              </div>
              {product.has_discount && product.discount_percentage && originalPrice && (
                <p className="mt-1 text-sm font-medium text-green-600">
                  Ahorrás {formatPrice(originalPrice - currentPrice)} (
                  {product.discount_percentage}% OFF)
                </p>
              )}
            </div>

            {/* Variants */}
            {product.variants.length > 0 && (
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  {product.variants[0].variant_type === 'size'
                    ? 'Tamaño'
                    : product.variants[0].variant_type === 'flavor'
                      ? 'Sabor'
                      : product.variants[0].variant_type === 'color'
                        ? 'Color'
                        : 'Variante'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => {
                        setSelectedVariant(variant.id)
                        setQuantity(1)
                      }}
                      disabled={variant.stock_quantity === 0}
                      className={`rounded-lg border-2 px-4 py-2 transition-all ${
                        selectedVariant === variant.id
                          ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]'
                          : variant.stock_quantity === 0
                            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                            : 'border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--primary)]'
                      }`}
                    >
                      {variant.name}
                      {variant.price_modifier !== 0 && (
                        <span className="ml-1 text-xs">
                          ({variant.price_modifier > 0 ? '+' : ''}
                          {formatPrice(variant.price_modifier)})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Status */}
            <div className="mb-6">
              {inStock ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">
                    {lowStock ? `¡Últimas ${stock} unidades!` : 'En Stock'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Sin Stock</span>
                </div>
              )}
            </div>

            {/* Quantity & Add to Cart */}
            {inStock && (
              <div className="mb-4 flex flex-col gap-4 sm:flex-row">
                {/* Quantity Selector */}
                <div className="flex items-center rounded-lg border border-[var(--border-default)]">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-3 transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= Math.min(stock, 99)}
                    className="p-3 transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart || !inStock}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
              </div>
            )}

            {/* Subscribe Button - Only for products that make sense for subscriptions */}
            {inStock && !product.is_prescription_required && (
              <div className="mb-6">
                <SubscribeButton
                  productId={product.id}
                  productName={product.name}
                  price={currentPrice}
                  variantId={selectedVariant}
                  variantName={
                    selectedVariant
                      ? product.variants.find((v) => v.id === selectedVariant)?.name
                      : null
                  }
                />
              </div>
            )}

            {/* Wishlist & Share */}
            <div className="mb-6 flex gap-4">
              <button
                onClick={handleWishlistToggle}
                disabled={togglingWishlist}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors disabled:opacity-50 ${
                  productIsWishlisted
                    ? 'border-red-500 bg-red-50 text-red-500'
                    : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-red-500 hover:text-red-500'
                }`}
              >
                {togglingWishlist ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Heart className={`h-5 w-5 ${productIsWishlisted ? 'fill-current' : ''}`} />
                )}
                <span className="hidden sm:inline">
                  {productIsWishlisted ? 'En Lista de Deseos' : 'Agregar a Lista'}
                </span>
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: product.name,
                      text: product.short_description || '',
                      url: window.location.href,
                    })
                  }
                }}
                className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] px-4 py-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                <Share2 className="h-5 w-5" />
                <span className="hidden sm:inline">Compartir</span>
              </button>
            </div>

            {/* Prescription Warning */}
            {product.is_prescription_required && (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">Requiere Receta Veterinaria</p>
                    <p className="mt-1 text-sm text-amber-700">
                      Este producto requiere una receta válida. Deberás presentarla al momento de la
                      compra.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-1 gap-4 rounded-lg bg-[var(--bg-subtle)] p-4 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <Truck className="h-6 w-6 text-[var(--primary)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Envío Rápido</p>
                  <p className="text-xs text-[var(--text-muted)]">Recibí mañana</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-[var(--primary)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Compra Segura</p>
                  <p className="text-xs text-[var(--text-muted)]">100% protegida</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <RotateCcw className="h-6 w-6 text-[var(--primary)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Devolución</p>
                  <p className="text-xs text-[var(--text-muted)]">15 días gratis</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Tabs (Description, Specs, Reviews) */}
        <div className="mt-12">
          <ProductTabs
            product={product}
            reviewSummary={data.review_summary}
            questions={data.questions}
            clinic={clinic}
            currencySymbol={currencySymbol}
          />
        </div>

        {/* Related Products */}
        {data.related_products.length > 0 && (
          <div className="mt-12">
            <RelatedProducts
              products={data.related_products}
              clinic={clinic}
              currencySymbol={currencySymbol}
            />
          </div>
        )}
      </main>

      {/* Mobile Sticky Add to Cart */}
      {inStock && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 lg:hidden">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xl font-bold text-[var(--text-primary)]">
                {formatPrice(currentPrice)}
              </span>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={addingToCart}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 font-semibold text-white"
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
                  Agregar
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
