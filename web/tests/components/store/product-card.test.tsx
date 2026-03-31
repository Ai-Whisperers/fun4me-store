import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ProductCard } from '@/components/store/product-card'
import type { ProductListItem } from '@/lib/types/store'
import { NextIntlClientProvider } from 'next-intl'

// Mock dependencies
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  )
}))

// Mock cart context
const mockAddToCart = vi.fn()
const mockUseCart = {
  addToCart: mockAddToCart,
  cartItems: [],
}
vi.mock('@/context/cart-context', () => ({
  useCart: () => mockUseCart
}))

// Mock wishlist context
const mockAddToWishlist = vi.fn()
const mockRemoveFromWishlist = vi.fn()
const mockIsInWishlist = vi.fn(() => false)
const mockUseWishlist = {
  addToWishlist: mockAddToWishlist,
  removeFromWishlist: mockRemoveFromWishlist,
  isInWishlist: mockIsInWishlist,
  isWishlisted: mockIsInWishlist, // Alternative name used in component
  wishlistItems: [],
}
vi.mock('@/context/wishlist-context', () => ({
  useWishlist: () => mockUseWishlist
}))

// Mock notifications
vi.mock('./notify-when-available', () => ({
  NotifyWhenAvailable: ({ children, onNotify }: any) => (
    <div data-testid="notify-when-available" onClick={onNotify}>
      {children}
    </div>
  )
}))

const messages = {
  store: {
    addToCart: 'Agregar al carrito',
    outOfStock: 'Agotado',
    prescription: 'Receta requerida',
    quickView: 'Vista rápida',
    loyaltyPoints: 'puntos',
    notifyWhenAvailable: 'Notificar cuando esté disponible',
    freeShipping: 'Envío gratis',
    newProduct: 'Nuevo',
    bestSeller: 'Más vendido',
    discount: 'descuento',
    addToWishlist: 'Agregar a favoritos',
    removeFromWishlist: 'Quitar de favoritos',
    soldBy: 'Vendido por',
    reviews: 'reseñas',
    viewProduct: 'Ver producto',
  }
}

const mockProduct: ProductListItem = {
  id: 'prod-1',
  name: 'Dog Food Premium',
  slug: 'dog-food-premium',
  price: 150000,
  originalPrice: 200000,
  image: '/images/dog-food.jpg',
  images: ['/images/dog-food.jpg', '/images/dog-food-2.jpg'],
  stock: 10,
  brand: 'Royal Canin',
  category: 'Food',
  description: 'Premium dog food for adult dogs',
  isPrescriptionRequired: false,
  isNewProduct: false,
  isBestSeller: true,
  rating: 4.5,
  reviewCount: 25,
  loyaltyPoints: 150,
  freeShipping: true,
  discountPercentage: 25,
}

const renderWithIntl = (component: React.ReactNode) => {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {component}
    </NextIntlClientProvider>
  )
}

describe('ProductCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsInWishlist.mockReturnValue(false)
  })

  describe('Basic rendering', () => {
    it('renders product information correctly', () => {
      renderWithIntl(
        <ProductCard product={mockProduct} clinic="terrapet" />
      )

      expect(screen.getByText('Dog Food Premium')).toBeInTheDocument()
      expect(screen.getByText('Royal Canin')).toBeInTheDocument()
      expect(screen.getByText('Gs 150.000')).toBeInTheDocument()
      expect(screen.getByText('Gs 200.000')).toBeInTheDocument() // Original price
    })

    it('renders product image with proper alt text', () => {
      renderWithIntl(
        <ProductCard product={mockProduct} clinic="terrapet" />
      )

      const image = screen.getByAltText('Dog Food Premium')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', '/images/dog-food.jpg')
    })

    it('creates correct product link', () => {
      renderWithIntl(
        <ProductCard product={mockProduct} clinic="terrapet" />
      )

      const productLink = screen.getByRole('link')
      expect(productLink).toHaveAttribute('href', '/terrapet/store/products/dog-food-premium')
    })
  })

  describe('Variant behavior', () => {
    it('shows all features in full variant by default', () => {
      renderWithIntl(
        <ProductCard product={mockProduct} clinic="terrapet" variant="full" />
      )

      // Should show wishlist, quick view, ratings by default for full variant
      expect(screen.getByLabelText(/agregar a favoritos/i)).toBeInTheDocument()
      expect(screen.getByText('Vista rápida')).toBeInTheDocument()
      expect(screen.getByText('4.5')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument() // review count
    })

    it('shows minimal features in minimal variant', () => {
      renderWithIntl(
        <ProductCard product={mockProduct} clinic="terrapet" variant="minimal" />
      )

      // Should not show wishlist, quick view, ratings by default for minimal variant
      expect(screen.queryByLabelText(/agregar a favoritos/i)).not.toBeInTheDocument()
      expect(screen.queryByText('Vista rápida')).not.toBeInTheDocument()
      expect(screen.queryByText('4.5')).not.toBeInTheDocument()
    })
  })

  describe('Stock and availability', () => {
    it('shows out of stock message when no stock', () => {
      const outOfStockProduct = { ...mockProduct, stock: 0 }
      
      renderWithIntl(
        <ProductCard product={outOfStockProduct} clinic="terrapet" />
      )

      expect(screen.getByText('Agotado')).toBeInTheDocument()
      expect(screen.queryByText('Agregar al carrito')).not.toBeInTheDocument()
    })

    it('shows notify when available for out of stock products', () => {
      const outOfStockProduct = { ...mockProduct, stock: 0 }
      
      renderWithIntl(
        <ProductCard product={outOfStockProduct} clinic="terrapet" />
      )

      expect(screen.getByTestId('notify-when-available')).toBeInTheDocument()
    })

    it('shows add to cart button when in stock', () => {
      renderWithIntl(
        <ProductCard product={mockProduct} clinic="terrapet" />
      )

      expect(screen.getByText('Agregar al carrito')).toBeInTheDocument()
    })
  })

  describe('Prescription requirement', () => {
    it('shows prescription required badge', () => {
      const prescriptionProduct = { ...mockProduct, isPrescriptionRequired: true }
      
      renderWithIntl(
        <ProductCard product={prescriptionProduct} clinic="terrapet" />
      )

      expect(screen.getByText('Receta requerida')).toBeInTheDocument()
    })
  })

  describe('Badges and indicators', () => {
    it('shows new product badge', () => {
      const newProduct = { ...mockProduct, isNewProduct: true }
      
      renderWithIntl(
        <ProductCard product={newProduct} clinic="terrapet" />
      )

      expect(screen.getByText('Nuevo')).toBeInTheDocument()
    })

    it('shows best seller badge', () => {
      renderWithIntl(
        <ProductCard product={mockProduct} clinic="terrapet" />
      )

      expect(screen.getByText('Más vendido')).toBeInTheDocument()
    })

    it('shows free shipping indicator', () => {
      renderWithIntl(
        <ProductCard product={mockProduct} clinic="terrapet" />
      )

      expect(screen.getByText('Envío gratis')).toBeInTheDocument()
    })

    it('shows discount percentage', () => {
      renderWithIntl(
        <ProductCard product={mockProduct} clinic="terrapet" />
      )

      expect(screen.getByText('25% descuento')).toBeInTheDocument()
    })
  })

  describe('Interactive features', () => {
    it('calls addToCart when add to cart button is clicked', async () => {
      renderWithIntl(
        <ProductCard product={mockProduct} clinic="terrapet" />
      )

      fireEvent.click(screen.getByText('Agregar al carrito'))
      
      expect(mockAddToCart).toHaveBeenCalledWith({
        productId: mockProduct.id,
        quantity: 1,
        selectedOptions: undefined,
      })
    })

    it('handles wishlist toggle correctly', async () => {
      renderWithIntl(
        <ProductCard product={mockProduct} clinic="terrapet" />
      )

      const wishlistButton = screen.getByLabelText(/agregar a favoritos/i)
      fireEvent.click(wishlistButton)
      
      expect(mockAddToWishlist).toHaveBeenCalledWith(mockProduct.id)
    })

    it('removes from wishlist when already in wishlist', async () => {
      mockIsInWishlist.mockReturnValue(true)
      
      renderWithIntl(
        <ProductCard product={mockProduct} clinic="terrapet" />
      )

      const wishlistButton = screen.getByLabelText(/quitar de favoritos/i)
      fireEvent.click(wishlistButton)
      
      expect(mockRemoveFromWishlist).toHaveBeenCalledWith(mockProduct.id)
    })

    it('calls onQuickView when quick view is clicked', () => {
      const mockQuickView = vi.fn()
      
      renderWithIntl(
        <ProductCard 
          product={mockProduct} 
          clinic="terrapet" 
          onQuickView={mockQuickView} 
        />
      )

      fireEvent.click(screen.getByText('Vista rápida'))
      expect(mockQuickView).toHaveBeenCalledWith(mockProduct)
    })
  })

  describe('Custom currency', () => {
    it('displays custom currency symbol', () => {
      renderWithIntl(
        <ProductCard 
          product={mockProduct} 
          clinic="terrapet" 
          currencySymbol="$" 
        />
      )

      expect(screen.getByText('$ 150.000')).toBeInTheDocument()
      expect(screen.getByText('$ 200.000')).toBeInTheDocument()
    })
  })

  describe('Feature overrides', () => {
    it('respects explicit feature props over variant defaults', () => {
      renderWithIntl(
        <ProductCard 
          product={mockProduct} 
          clinic="terrapet" 
          variant="minimal"
          showWishlist={true}
          showQuickView={true}
          showRatings={true}
          onQuickView={vi.fn()}
        />
      )

      // Should show features even in minimal variant when explicitly enabled
      expect(screen.getByLabelText(/agregar a favoritos/i)).toBeInTheDocument()
      expect(screen.getByText('Vista rápida')).toBeInTheDocument()
      expect(screen.getByText('4.5')).toBeInTheDocument()
    })

    it('can disable features in full variant', () => {
      renderWithIntl(
        <ProductCard 
          product={mockProduct} 
          clinic="terrapet" 
          variant="full"
          showWishlist={false}
          showQuickView={false}
          showRatings={false}
        />
      )

      // Should not show features when explicitly disabled
      expect(screen.queryByLabelText(/agregar a favoritos/i)).not.toBeInTheDocument()
      expect(screen.queryByText('Vista rápida')).not.toBeInTheDocument()
      expect(screen.queryByText('4.5')).not.toBeInTheDocument()
    })
  })

  describe('Image error handling', () => {
    it('shows placeholder when image fails to load', () => {
      const productWithoutImage = { ...mockProduct, image: '' }
      
      renderWithIntl(
        <ProductCard product={productWithoutImage} clinic="terrapet" />
      )

      expect(screen.getByTestId('image-placeholder')).toBeInTheDocument()
    })
  })

  describe('Loyalty points', () => {
    it('shows loyalty points when feature is enabled', () => {
      renderWithIntl(
        <ProductCard product={mockProduct} clinic="terrapet" showLoyaltyPoints={true} />
      )

      expect(screen.getByText('150 puntos')).toBeInTheDocument()
    })
  })

  describe('Loading states', () => {
    it('shows loading state when adding to cart', async () => {
      mockAddToCart.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      renderWithIntl(
        <ProductCard product={mockProduct} clinic="terrapet" />
      )

      fireEvent.click(screen.getByText('Agregar al carrito'))
      
      expect(screen.getByRole('button', { name: /agregar al carrito/i })).toBeDisabled()
    })
  })
})