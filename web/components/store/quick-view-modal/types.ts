import type { ProductListItem } from '@/lib/types/store'

export interface QuickViewModalProps {
  product: ProductListItem
  clinic: string
  onClose: () => void
}

export interface ProductImage {
  id: string
  image_url: string
  alt_text?: string | null
}

export interface ImageGalleryProps {
  images: ProductImage[]
  productName: string
  inStock: boolean
  hasDiscount: boolean
  discountPercentage?: number | null
}

export interface ProductInfoProps {
  product: ProductListItem
  stock: number
  inStock: boolean
  lowStock: boolean
}

export interface QuantitySelectorProps {
  quantity: number
  stock: number
  onChange: (quantity: number) => void
}

export interface ActionButtonsProps {
  inStock: boolean
  addingToCart: boolean
  addedToCart: boolean
  productIsWishlisted: boolean
  togglingWishlist: boolean
  onAddToCart: () => void
  onWishlistToggle: () => void
}

export interface BenefitsGridProps {
  className?: string
}
