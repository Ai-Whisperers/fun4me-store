/**
 * @deprecated Use ProductCard from './product-card' instead.
 * This file is kept for backwards compatibility.
 *
 * Migration:
 * - import EnhancedProductCard from './enhanced-product-card'
 * + import { ProductCard } from './product-card'
 *
 * The new ProductCard supports both variants:
 * - variant="minimal" - basic display (old ProductCard behavior)
 * - variant="full" - feature-rich display (old EnhancedProductCard behavior)
 */

export { ProductCard as default, type ProductCardProps } from './product-card'
