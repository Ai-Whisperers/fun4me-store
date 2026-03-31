'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useCart } from '@/context/cart-context'
import { useWishlist } from '@/context/wishlist-context'
import { ImageGallery } from './image-gallery'
import { ProductInfo } from './product-info'
import { QuantitySelector } from './quantity-selector'
import { ActionButtons } from './action-buttons'
import { BenefitsGrid } from './benefits-grid'
import type { QuickViewModalProps, ProductImage } from './types'

/**
 * Quick View Modal
 *
 * A modal for quickly viewing product details without navigating away.
 * Split into smaller components for maintainability:
 * - ImageGallery: Product image carousel with thumbnails
 * - ProductInfo: Name, price, description, stock status
 * - QuantitySelector: Quantity controls
 * - ActionButtons: Add to cart and wishlist buttons
 * - BenefitsGrid: Shipping, warranty, returns info
 */
export default function QuickViewModal({
  product,
  clinic,
  onClose,
}: QuickViewModalProps): React.ReactElement {
  const { addItem } = useCart()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const [quantity, setQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [togglingWishlist, setTogglingWishlist] = useState(false)

  const productIsWishlisted = isWishlisted(product.id)

  // Support both direct stock_quantity and nested inventory.stock_quantity
  const stock = product.stock_quantity ?? product.inventory?.stock_quantity ?? 0
  const inStock = stock > 0
  const lowStock = stock > 0 && stock <= 5

  // Combine main image with gallery images (safely handle optional images array)
  const productImages = product.images ?? []
  const images: ProductImage[] = product.image_url
    ? [{ id: 'main', image_url: product.image_url, alt_text: product.name }, ...productImages]
    : productImages.length > 0
      ? productImages
      : [{ id: 'placeholder', image_url: '/placeholder-product.svg', alt_text: product.name }]

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleAddToCart = useCallback((): void => {
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
      quantity
    )

    setTimeout(() => {
      setAddingToCart(false)
      setAddedToCart(true)
      setTimeout(() => setAddedToCart(false), 2000)
    }, 300)
  }, [addItem, addingToCart, inStock, product, quantity, stock])

  const handleWishlistToggle = useCallback(async (): Promise<void> => {
    if (togglingWishlist) return
    setTogglingWishlist(true)
    try {
      await toggleWishlist(product.id)
    } finally {
      setTogglingWishlist(false)
    }
  }, [product.id, toggleWishlist, togglingWishlist])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="animate-scale-in relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 shadow-md backdrop-blur transition-colors hover:bg-gray-100"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex max-h-[90vh] flex-col md:flex-row">
          {/* Image Gallery */}
          <ImageGallery
            images={images}
            productName={product.name}
            inStock={inStock}
            hasDiscount={product.has_discount ?? false}
            discountPercentage={product.discount_percentage}
          />

          {/* Product Info */}
          <div className="w-full overflow-y-auto p-6 md:w-1/2">
            <ProductInfo product={product} stock={stock} inStock={inStock} lowStock={lowStock} />

            {/* Quantity Selector */}
            {inStock && (
              <QuantitySelector quantity={quantity} stock={stock} onChange={setQuantity} />
            )}

            {/* Action Buttons */}
            <ActionButtons
              inStock={inStock}
              addingToCart={addingToCart}
              addedToCart={addedToCart}
              productIsWishlisted={productIsWishlisted}
              togglingWishlist={togglingWishlist}
              onAddToCart={handleAddToCart}
              onWishlistToggle={handleWishlistToggle}
            />

            {/* Benefits */}
            <BenefitsGrid />

            {/* View Full Details Link */}
            <Link
              href={`/${clinic}/store/product/${product.id}`}
              className="block text-center font-medium text-[var(--primary)] hover:underline"
            >
              Ver todos los detalles &rarr;
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}

// Re-export types for external use
export type { QuickViewModalProps } from './types'
