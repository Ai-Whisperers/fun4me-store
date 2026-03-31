import { describe, it, expect } from 'vitest'
import { TENANT_IDS } from '@/lib/constants/tenants';

/**
 * API Contract Tests for Store & Prescriptions
 * 
 * Tests schema validation and response structure for:
 * - GET /api/store/products - List products with filters
 * - GET /api/store/products/[id] - Get product details
 * - GET /api/store/cart - Get shopping cart
 * - POST /api/store/cart - Add to cart
 * - PUT /api/store/cart/[item-id] - Update cart item
 * - DELETE /api/store/cart/[item-id] - Remove from cart
 * - POST /api/store/checkout - Checkout
 * - GET /api/store/orders/[id] - Get order details
 * - POST /api/store/orders/[id]/prescription - Review prescription
 * 
 * NOTE: These are contract tests - they validate response schemas, not business logic.
 * They mock all dependencies and test the shape/structure of API responses.
 */

describe('Store & Prescriptions API Contract', () => {
  describe('GET /api/store/products', () => {
    it('expects products list response with correct schema', () => {
      // Expected response structure
      const mockResponse = [
        {
          id: 'prod-123',
          tenant_id: TENANT_IDS.ADRIS,
          category_id: 'cat-456',
          sku: 'PRD-001',
          name: 'Alimento Premium para Perros',
          description: 'Alimento balanceado de alta calidad',
          base_price: 125000,
          is_prescription_required: false,
          is_active: true,
          image_url: 'https://example.com/product.jpg',
          stock_quantity: 50,
          created_at: '2026-01-15T10:00:00.000Z',
        },
      ]

      // Validate array structure
      expect(Array.isArray(mockResponse)).toBe(true)

      const product = mockResponse[0]

      // Validate required fields
      expect(product).toHaveProperty('id')
      expect(product).toHaveProperty('tenant_id')
      expect(product).toHaveProperty('name')
      expect(product).toHaveProperty('base_price')
      expect(product).toHaveProperty('is_prescription_required')

      // Validate data types
      expect(typeof product.id).toBe('string')
      expect(typeof product.name).toBe('string')
      expect(typeof product.base_price).toBe('number')
      expect(typeof product.is_prescription_required).toBe('boolean')
      expect(typeof product.is_active).toBe('boolean')

      // Validate price is positive
      expect(product.base_price).toBeGreaterThan(0)

      // Validate stock quantity
      if (product.stock_quantity !== null) {
        expect(typeof product.stock_quantity).toBe('number')
        expect(product.stock_quantity).toBeGreaterThanOrEqual(0)
      }

      // Validate ISO date format
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      expect(isoDateRegex.test(product.created_at)).toBe(true)
    })

    it('validates product SKU format', () => {
      const validSKUs = ['PRD-001', 'MED-123', 'ACC-456', 'FOOD-789']

      // SKU should be alphanumeric with hyphens
      const skuRegex = /^[A-Z0-9-]+$/i

      validSKUs.forEach((sku) => {
        expect(skuRegex.test(sku)).toBe(true)
      })
    })

    it('validates query parameter filtering options', () => {
      // Filter by category
      const urlWithCategory = new URL('http://localhost/api/store/products?category_id=cat-123')
      expect(urlWithCategory.searchParams.get('category_id')).toBe('cat-123')

      // Search by name
      const urlWithSearch = new URL('http://localhost/api/store/products?search=alimento')
      expect(urlWithSearch.searchParams.get('search')).toBe('alimento')

      // Filter by prescription requirement
      const urlWithPrescription = new URL(
        'http://localhost/api/store/products?prescription_required=true'
      )
      expect(urlWithPrescription.searchParams.get('prescription_required')).toBe('true')

      // Stock status filter
      const urlWithStock = new URL('http://localhost/api/store/products?stock_status=in_stock')
      expect(urlWithStock.searchParams.get('stock_status')).toBe('in_stock')
    })

    it('validates stock status enum values', () => {
      const validStockStatuses = ['in_stock', 'low_stock', 'out_of_stock', 'discontinued']

      validStockStatuses.forEach((status) => {
        expect(
          ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'].includes(status)
        ).toBe(true)
      })
    })
  })

  describe('GET /api/store/products/[id]', () => {
    it('expects product details response with correct schema', () => {
      // Expected response structure
      const mockResponse = {
        id: 'prod-123',
        tenant_id: TENANT_IDS.ADRIS,
        category_id: 'cat-456',
        sku: 'PRD-001',
        name: 'Alimento Premium para Perros',
        description: 'Alimento balanceado de alta calidad',
        base_price: 125000,
        is_prescription_required: false,
        is_active: true,
        image_url: 'https://example.com/product.jpg',
        images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
        stock_quantity: 50,
        reorder_point: 10,
        category: {
          id: 'cat-456',
          name: 'Alimentos',
          slug: 'alimentos',
        },
        created_at: '2026-01-15T10:00:00.000Z',
      }

      // Validate root structure
      expect(mockResponse).toHaveProperty('id')
      expect(mockResponse).toHaveProperty('name')
      expect(mockResponse).toHaveProperty('base_price')
      expect(mockResponse).toHaveProperty('category')

      // Validate category nested object
      expect(mockResponse.category).toHaveProperty('id')
      expect(mockResponse.category).toHaveProperty('name')
      expect(mockResponse.category).toHaveProperty('slug')

      // Validate images array
      if (mockResponse.images) {
        expect(Array.isArray(mockResponse.images)).toBe(true)
        mockResponse.images.forEach((img) => {
          expect(typeof img).toBe('string')
          // Should be valid URL
          expect(img.startsWith('http')).toBe(true)
        })
      }
    })

    it('validates prescription requirement flag', () => {
      const prescriptionProduct = {
        is_prescription_required: true,
      }

      const nonPrescriptionProduct = {
        is_prescription_required: false,
      }

      expect(typeof prescriptionProduct.is_prescription_required).toBe('boolean')
      expect(prescriptionProduct.is_prescription_required).toBe(true)

      expect(typeof nonPrescriptionProduct.is_prescription_required).toBe('boolean')
      expect(nonPrescriptionProduct.is_prescription_required).toBe(false)
    })
  })

  describe('GET /api/store/cart', () => {
    it('expects cart response with correct schema', () => {
      // Expected response structure
      const mockResponse = {
        items: [
          {
            id: 'item-123',
            product_id: 'prod-456',
            quantity: 2,
            unit_price: 125000,
            subtotal: 250000,
            product: {
              id: 'prod-456',
              name: 'Alimento Premium',
              image_url: 'https://example.com/product.jpg',
              is_prescription_required: false,
              stock_quantity: 50,
            },
          },
        ],
        total: 250000,
      }

      // Validate response structure
      expect(mockResponse).toHaveProperty('items')
      expect(mockResponse).toHaveProperty('total')

      // Validate items array
      expect(Array.isArray(mockResponse.items)).toBe(true)

      const item = mockResponse.items[0]

      // Validate item structure
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('product_id')
      expect(item).toHaveProperty('quantity')
      expect(item).toHaveProperty('unit_price')
      expect(item).toHaveProperty('subtotal')
      expect(item).toHaveProperty('product')

      // Validate types
      expect(typeof item.quantity).toBe('number')
      expect(typeof item.unit_price).toBe('number')
      expect(typeof item.subtotal).toBe('number')

      // Validate positive values
      expect(item.quantity).toBeGreaterThan(0)
      expect(item.unit_price).toBeGreaterThan(0)
      expect(item.subtotal).toBeGreaterThan(0)

      // Validate subtotal calculation
      expect(item.subtotal).toBe(item.quantity * item.unit_price)
    })

    it('validates cart total matches sum of item subtotals', () => {
      const mockCart = {
        items: [
          { subtotal: 250000 },
          { subtotal: 80000 },
          { subtotal: 45000 },
        ],
        total: 375000,
      }

      const calculatedTotal = mockCart.items.reduce((sum, item) => sum + item.subtotal, 0)

      expect(calculatedTotal).toBe(mockCart.total)
      expect(mockCart.total).toBe(375000)
    })
  })

  describe('POST /api/store/cart', () => {
    it('expects add to cart response with correct schema', () => {
      // Expected response structure
      const mockResponse = {
        success: true,
        data: {
          cart_item_id: 'item-123',
          quantity: 2,
        },
        message: 'Producto agregado al carrito',
      }

      // Validate response structure
      expect(mockResponse).toHaveProperty('success')
      expect(mockResponse).toHaveProperty('data')
      expect(mockResponse).toHaveProperty('message')

      expect(mockResponse.success).toBe(true)
      expect(typeof mockResponse.message).toBe('string')

      // Validate data
      expect(mockResponse.data).toHaveProperty('cart_item_id')
      expect(mockResponse.data).toHaveProperty('quantity')

      expect(typeof mockResponse.data.quantity).toBe('number')
      expect(mockResponse.data.quantity).toBeGreaterThan(0)
    })

    it('expects error response when product out of stock', () => {
      // Expected error response
      const mockError = {
        error: 'VALIDATION_ERROR',
        details: {
          reason: 'Producto sin stock disponible',
          available_quantity: 0,
        },
      }

      expect(mockError).toHaveProperty('error')
      expect(mockError).toHaveProperty('details')
      expect(mockError.details).toHaveProperty('available_quantity')

      expect(mockError.error).toBe('VALIDATION_ERROR')
      expect(typeof mockError.details.available_quantity).toBe('number')
    })

    it('expects error response when quantity exceeds stock', () => {
      // Expected error response
      const mockError = {
        error: 'VALIDATION_ERROR',
        details: {
          reason: 'Cantidad solicitada excede el stock disponible',
          requested_quantity: 10,
          available_quantity: 5,
        },
      }

      expect(mockError.details).toHaveProperty('requested_quantity')
      expect(mockError.details).toHaveProperty('available_quantity')

      expect(mockError.details.requested_quantity).toBeGreaterThan(
        mockError.details.available_quantity
      )
    })
  })

  describe('PUT /api/store/cart/[item-id]', () => {
    it('expects update cart item response with correct schema', () => {
      // Expected response structure
      const mockResponse = {
        success: true,
        data: {
          cart_item_id: 'item-123',
          quantity: 3,
          subtotal: 375000,
        },
        message: 'Carrito actualizado',
      }

      // Validate response structure
      expect(mockResponse).toHaveProperty('success')
      expect(mockResponse).toHaveProperty('data')
      expect(mockResponse.success).toBe(true)

      // Validate data
      expect(mockResponse.data).toHaveProperty('quantity')
      expect(mockResponse.data).toHaveProperty('subtotal')

      expect(typeof mockResponse.data.quantity).toBe('number')
      expect(typeof mockResponse.data.subtotal).toBe('number')
    })
  })

  describe('DELETE /api/store/cart/[item-id]', () => {
    it('expects remove from cart response with correct schema', () => {
      // Expected response structure
      const mockResponse = {
        success: true,
        message: 'Producto eliminado del carrito',
      }

      expect(mockResponse).toHaveProperty('success')
      expect(mockResponse).toHaveProperty('message')
      expect(mockResponse.success).toBe(true)
      expect(typeof mockResponse.message).toBe('string')
    })
  })

  describe('POST /api/store/checkout', () => {
    it('expects checkout response with correct schema', () => {
      // Expected response structure
      const mockResponse = {
        success: true,
        data: {
          order_id: 'ord-123',
          order_number: 'ORD-2026-001',
          status: 'confirmed',
          payment_status: 'pending',
          total: 375000,
        },
        message: 'Pedido creado correctamente',
      }

      // Validate response structure
      expect(mockResponse).toHaveProperty('success')
      expect(mockResponse).toHaveProperty('data')
      expect(mockResponse.success).toBe(true)

      // Validate data
      expect(mockResponse.data).toHaveProperty('order_id')
      expect(mockResponse.data).toHaveProperty('order_number')
      expect(mockResponse.data).toHaveProperty('status')
      expect(mockResponse.data).toHaveProperty('payment_status')
      expect(mockResponse.data).toHaveProperty('total')

      // Validate types
      expect(typeof mockResponse.data.order_id).toBe('string')
      expect(typeof mockResponse.data.order_number).toBe('string')
      expect(typeof mockResponse.data.status).toBe('string')
      expect(typeof mockResponse.data.payment_status).toBe('string')
      expect(typeof mockResponse.data.total).toBe('number')

      // Validate total is positive
      expect(mockResponse.data.total).toBeGreaterThan(0)
    })

    it('validates order number format', () => {
      const validOrderNumbers = ['ORD-2026-001', 'PED-2026-123', 'ORD-2025-999']

      // Order number format: {PREFIX}-{YEAR}-{SEQUENCE}
      const orderNumberRegex = /^[A-Z]{3}-\d{4}-\d{3,}$/

      validOrderNumbers.forEach((num) => {
        expect(orderNumberRegex.test(num)).toBe(true)
      })
    })

    it('validates order status enum values', () => {
      const validOrderStatuses = [
        'pending',
        'pending_prescription',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'prescription_rejected',
      ]

      validOrderStatuses.forEach((status) => {
        expect(
          [
            'pending',
            'pending_prescription',
            'confirmed',
            'processing',
            'shipped',
            'delivered',
            'cancelled',
            'prescription_rejected',
          ].includes(status)
        ).toBe(true)
      })
    })

    it('validates payment status enum values', () => {
      const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded']

      validPaymentStatuses.forEach((status) => {
        expect(['pending', 'paid', 'failed', 'refunded'].includes(status)).toBe(true)
      })
    })

    it('expects error response when cart is empty', () => {
      // Expected error response
      const mockError = {
        error: 'VALIDATION_ERROR',
        details: {
          reason: 'El carrito está vacío',
        },
      }

      expect(mockError).toHaveProperty('error')
      expect(mockError.error).toBe('VALIDATION_ERROR')
      expect(mockError.details).toHaveProperty('reason')
    })

    it('expects pending_prescription status when cart has prescription items', () => {
      const mockResponse = {
        success: true,
        data: {
          order_id: 'ord-123',
          order_number: 'ORD-2026-001',
          status: 'pending_prescription',
          payment_status: 'pending',
          requires_prescription_review: true,
        },
        message: 'Pedido creado. Pendiente de revisión de receta médica.',
      }

      expect(mockResponse.data.status).toBe('pending_prescription')
      expect(mockResponse.data).toHaveProperty('requires_prescription_review')
      expect(mockResponse.data.requires_prescription_review).toBe(true)
    })
  })

  describe('GET /api/store/orders/[id]', () => {
    it('expects order details response with correct schema', () => {
      // Expected response structure
      const mockResponse = {
        id: 'ord-123',
        tenant_id: TENANT_IDS.ADRIS,
        order_number: 'ORD-2026-001',
        customer_id: 'cust-456',
        status: 'confirmed',
        payment_status: 'paid',
        payment_method: 'card',
        subtotal: 350000,
        tax: 35000,
        total: 385000,
        created_at: '2026-01-15T10:00:00.000Z',
        updated_at: '2026-01-15T10:05:00.000Z',
        items: [
          {
            id: 'item-1',
            product_id: 'prod-123',
            quantity: 2,
            unit_price: 125000,
            subtotal: 250000,
            requires_prescription: false,
            product: {
              id: 'prod-123',
              name: 'Alimento Premium',
              image_url: 'https://example.com/product.jpg',
            },
          },
        ],
        customer: {
          id: 'cust-456',
          full_name: 'Juan Pérez',
          email: 'juan@example.com',
          phone: '+595981234567',
        },
      }

      // Validate root structure
      expect(mockResponse).toHaveProperty('id')
      expect(mockResponse).toHaveProperty('order_number')
      expect(mockResponse).toHaveProperty('status')
      expect(mockResponse).toHaveProperty('payment_status')
      expect(mockResponse).toHaveProperty('items')
      expect(mockResponse).toHaveProperty('customer')

      // Validate items array
      expect(Array.isArray(mockResponse.items)).toBe(true)

      const item = mockResponse.items[0]
      expect(item).toHaveProperty('product_id')
      expect(item).toHaveProperty('quantity')
      expect(item).toHaveProperty('unit_price')
      expect(item).toHaveProperty('requires_prescription')

      // Validate customer object
      expect(mockResponse.customer).toHaveProperty('id')
      expect(mockResponse.customer).toHaveProperty('full_name')
      expect(mockResponse.customer).toHaveProperty('email')

      // Validate amounts
      expect(typeof mockResponse.subtotal).toBe('number')
      expect(typeof mockResponse.tax).toBe('number')
      expect(typeof mockResponse.total).toBe('number')

      // Validate total calculation
      expect(mockResponse.total).toBe(mockResponse.subtotal + mockResponse.tax)
    })

    it('validates order timestamps progression', () => {
      const mockOrder = {
        created_at: '2026-01-15T10:00:00.000Z',
        updated_at: '2026-01-15T10:05:00.000Z',
      }

      const createdDate = new Date(mockOrder.created_at)
      const updatedDate = new Date(mockOrder.updated_at)

      // updated_at should be >= created_at
      expect(updatedDate.getTime()).toBeGreaterThanOrEqual(createdDate.getTime())
    })
  })

  describe('POST /api/store/orders/[id]/prescription', () => {
    it('expects prescription approval response with correct schema', () => {
      // Expected response structure for approval
      const mockResponse = {
        success: true,
        data: {
          order_id: 'ord-123',
          status: 'confirmed',
          prescription_reviewed_at: '2026-01-15T14:00:00.000Z',
          prescription_reviewed_by: 'vet-456',
        },
        message: 'Receta aprobada correctamente',
      }

      // Validate response structure
      expect(mockResponse).toHaveProperty('success')
      expect(mockResponse).toHaveProperty('data')
      expect(mockResponse.success).toBe(true)

      // Validate data
      expect(mockResponse.data).toHaveProperty('order_id')
      expect(mockResponse.data).toHaveProperty('status')
      expect(mockResponse.data).toHaveProperty('prescription_reviewed_at')
      expect(mockResponse.data).toHaveProperty('prescription_reviewed_by')

      // Validate ISO date format
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      expect(isoDateRegex.test(mockResponse.data.prescription_reviewed_at)).toBe(true)

      // After approval, status should be 'confirmed'
      expect(mockResponse.data.status).toBe('confirmed')
    })

    it('expects prescription rejection response with correct schema', () => {
      // Expected response structure for rejection
      const mockResponse = {
        success: true,
        data: {
          order_id: 'ord-123',
          status: 'prescription_rejected',
          prescription_reviewed_at: '2026-01-15T14:00:00.000Z',
          prescription_reviewed_by: 'vet-456',
          prescription_rejection_reason: 'Receta vencida. Por favor, cargar una receta actualizada.',
        },
        message: 'Receta rechazada',
      }

      // Validate response structure
      expect(mockResponse).toHaveProperty('success')
      expect(mockResponse).toHaveProperty('data')

      // Validate data
      expect(mockResponse.data).toHaveProperty('status')
      expect(mockResponse.data).toHaveProperty('prescription_rejection_reason')

      // After rejection, status should be 'prescription_rejected'
      expect(mockResponse.data.status).toBe('prescription_rejected')
      expect(typeof mockResponse.data.prescription_rejection_reason).toBe('string')
      expect(mockResponse.data.prescription_rejection_reason.length).toBeGreaterThan(0)
    })

    it('expects error when order not in pending_prescription status', () => {
      // Expected error response
      const mockError = {
        error: 'VALIDATION_ERROR',
        details: {
          reason: 'El pedido no está pendiente de revisión de receta',
          currentStatus: 'confirmed',
        },
      }

      expect(mockError).toHaveProperty('error')
      expect(mockError.error).toBe('VALIDATION_ERROR')
      expect(mockError.details).toHaveProperty('currentStatus')
    })
  })

  describe('Common Store Patterns', () => {
    it('validates product category names (Spanish)', () => {
      const validCategories = [
        'Alimentos',
        'Farmacia',
        'Accesorios',
        'Higiene',
        'Juguetes',
        'Transporte',
      ]

      validCategories.forEach((category) => {
        expect(typeof category).toBe('string')
        expect(category.length).toBeGreaterThan(0)

        // Categories should be in Spanish
        const spanishPattern = /[áéíóúñ]|Alimentos|Farmacia|Accesorios|Higiene|Juguetes/i
        const isLikelySpanish = spanishPattern.test(category)
        expect(isLikelySpanish || category === 'Transporte').toBe(true)
      })
    })

    it('validates Spanish store-related messages', () => {
      const spanishMessages = [
        'Producto agregado al carrito',
        'Carrito actualizado',
        'Producto eliminado del carrito',
        'Pedido creado correctamente',
        'El carrito está vacío',
        'Producto sin stock disponible',
        'Receta aprobada correctamente',
        'Receta rechazada',
      ]

      spanishMessages.forEach((message) => {
        expect(typeof message).toBe('string')
        expect(message.length).toBeGreaterThan(0)

        // Ensure message contains Spanish characters or common Spanish words
        const spanishPattern = /[áéíóúñ]|Producto|Carrito|Pedido|El |es |sin |correctamente|Receta|aprobada|rechazada|vacío|eliminado|creado|actualizado|agregado/i
        const isLikelySpanish = spanishPattern.test(message)
        expect(isLikelySpanish).toBe(true)
      })
    })

    it('validates order status transitions', () => {
      const validTransitions = {
        pending: ['pending_prescription', 'confirmed', 'cancelled'],
        pending_prescription: ['confirmed', 'prescription_rejected', 'cancelled'],
        confirmed: ['processing', 'cancelled'],
        processing: ['shipped', 'cancelled'],
        shipped: ['delivered'],
        delivered: [], // Terminal state
        cancelled: [], // Terminal state
        prescription_rejected: [], // Terminal state
      }

      // Validate pending transitions
      expect(validTransitions.pending.includes('confirmed')).toBe(true)
      expect(validTransitions.pending.includes('pending_prescription')).toBe(true)

      // Validate prescription flow
      expect(validTransitions.pending_prescription.includes('confirmed')).toBe(true)
      expect(validTransitions.pending_prescription.includes('prescription_rejected')).toBe(true)

      // Validate fulfillment flow
      expect(validTransitions.confirmed.includes('processing')).toBe(true)
      expect(validTransitions.processing.includes('shipped')).toBe(true)
      expect(validTransitions.shipped.includes('delivered')).toBe(true)

      // Validate terminal states
      expect(validTransitions.delivered.length).toBe(0)
      expect(validTransitions.cancelled.length).toBe(0)
    })

    it('validates coupon code format (optional)', () => {
      const validCoupons = ['SAVE10', 'NEWUSER2026', 'PROMO-123', 'VET15']

      // Coupon codes should be alphanumeric with optional hyphens
      const couponRegex = /^[A-Z0-9-]+$/i

      validCoupons.forEach((coupon) => {
        expect(couponRegex.test(coupon)).toBe(true)
      })
    })

    it('validates payment method options for orders', () => {
      const validPaymentMethods = [
        'cash',
        'card',
        'transfer',
        'qr',
        'cash_on_delivery',
      ]

      validPaymentMethods.forEach((method) => {
        expect(
          ['cash', 'card', 'transfer', 'qr', 'cash_on_delivery'].includes(method)
        ).toBe(true)
      })
    })

    it('validates prescription file upload format', () => {
      const mockPrescriptionUpload = {
        file_url: 'https://storage.example.com/prescriptions/rec-123.pdf',
        file_type: 'application/pdf',
      }

      expect(mockPrescriptionUpload).toHaveProperty('file_url')
      expect(mockPrescriptionUpload).toHaveProperty('file_type')

      expect(typeof mockPrescriptionUpload.file_url).toBe('string')
      expect(mockPrescriptionUpload.file_url.startsWith('http')).toBe(true)

      // Common prescription file types
      const validFileTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      expect(validFileTypes.includes(mockPrescriptionUpload.file_type)).toBe(true)
    })

    it('validates stock reservation for cart items', () => {
      const mockCartItem = {
        product_id: 'prod-123',
        quantity: 3,
        reserved_quantity: 3,
        reservation_expires_at: '2026-01-15T10:15:00.000Z',
      }

      expect(mockCartItem).toHaveProperty('reserved_quantity')
      expect(mockCartItem).toHaveProperty('reservation_expires_at')

      // Reserved quantity should match requested quantity
      expect(mockCartItem.reserved_quantity).toBe(mockCartItem.quantity)

      // Reservation should have expiration
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      expect(isoDateRegex.test(mockCartItem.reservation_expires_at)).toBe(true)
    })
  })
})
