import { describe, it, expect } from 'vitest'
import { checkoutRequestSchema, createStoreOrderSchema } from '@/lib/schemas/store'

describe('checkoutRequestSchema', () => {
  describe('valid inputs', () => {
    it('validates minimal checkout request', () => {
      const result = checkoutRequestSchema.safeParse({
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Test Product',
            price: 1000,
            type: 'product',
            quantity: 1,
          },
        ],
        clinic: 'terrapet',
      })
      expect(result.success).toBe(true)
    })

    it('validates checkout with prescription item and pet_id', () => {
      const input = {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Antibiótico',
            price: 50000,
            type: 'product',
            quantity: 1,
            requires_prescription: true,
          },
        ],
        clinic: 'terrapet',
        pet_id: '660e8400-e29b-41d4-a716-446655440001',
        requires_prescription_review: true,
      }
      const result = checkoutRequestSchema.safeParse(input)
      if (!result.success) {
        console.log('Validation errors:', JSON.stringify(result.error.issues, null, 2))
      }
      expect(result.success).toBe(true)
    })

    it('validates checkout with service item', () => {
      const result = checkoutRequestSchema.safeParse({
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Consulta',
            price: 80000,
            type: 'service',
            quantity: 1,
          },
        ],
        clinic: 'terrapet',
        notes: 'Consulta urgente',
      })
      expect(result.success).toBe(true)
    })

    it('validates checkout with mixed items', () => {
      const result = checkoutRequestSchema.safeParse({
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Consulta',
            price: 80000,
            type: 'service',
            quantity: 1,
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Antiparasitario',
            price: 25000,
            type: 'product',
            quantity: 2,
          },
        ],
        clinic: 'terrapet',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('rejects empty items array', () => {
      const result = checkoutRequestSchema.safeParse({
        items: [],
        clinic: 'terrapet',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('El carrito está vacío')
      }
    })

    it('rejects missing clinic', () => {
      const result = checkoutRequestSchema.safeParse({
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Test',
            price: 1000,
            type: 'product',
            quantity: 1,
          },
        ],
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid item type', () => {
      const result = checkoutRequestSchema.safeParse({
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Test',
            price: 1000,
            type: 'invalid',
            quantity: 1,
          },
        ],
        clinic: 'terrapet',
      })
      expect(result.success).toBe(false)
    })

    it('rejects quantity less than 1', () => {
      const result = checkoutRequestSchema.safeParse({
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Test',
            price: 1000,
            type: 'product',
            quantity: 0,
          },
        ],
        clinic: 'terrapet',
      })
      expect(result.success).toBe(false)
    })

    it('rejects quantity greater than 99', () => {
      const result = checkoutRequestSchema.safeParse({
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Test',
            price: 1000,
            type: 'product',
            quantity: 100,
          },
        ],
        clinic: 'terrapet',
      })
      expect(result.success).toBe(false)
    })

    it('rejects negative price', () => {
      const result = checkoutRequestSchema.safeParse({
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Test',
            price: -1000,
            type: 'product',
            quantity: 1,
          },
        ],
        clinic: 'terrapet',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid UUID for item id', () => {
      const result = checkoutRequestSchema.safeParse({
        items: [
          {
            id: 'not-a-uuid',
            name: 'Test',
            price: 1000,
            type: 'product',
            quantity: 1,
          },
        ],
        clinic: 'terrapet',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid UUID for pet_id', () => {
      const result = checkoutRequestSchema.safeParse({
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Test',
            price: 1000,
            type: 'product',
            quantity: 1,
          },
        ],
        clinic: 'terrapet',
        pet_id: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid prescription_file_url', () => {
      const result = checkoutRequestSchema.safeParse({
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Test',
            price: 1000,
            type: 'product',
            quantity: 1,
            requires_prescription: true,
            prescription_file_url: 'not-a-url',
          },
        ],
        clinic: 'terrapet',
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('createStoreOrderSchema', () => {
  it('includes pet_id field', () => {
    const input = {
      clinic: 'terrapet',
      items: [
        {
          product_id: '550e8400-e29b-41d4-a716-446655440000',
          quantity: 1,
          unit_price: 1000,
        },
      ],
      pet_id: '660e8400-e29b-41d4-a716-446655440001',
    }
    const result = createStoreOrderSchema.safeParse(input)
    if (!result.success) {
      console.log('createStoreOrderSchema errors:', JSON.stringify(result.error.issues, null, 2))
    }
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pet_id).toBe('660e8400-e29b-41d4-a716-446655440001')
    }
  })

  it('allows null pet_id', () => {
    const result = createStoreOrderSchema.safeParse({
      clinic: 'terrapet',
      items: [
        {
          product_id: '550e8400-e29b-41d4-a716-446655440000',
          quantity: 1,
          unit_price: 1000,
        },
      ],
      pet_id: null,
    })
    if (!result.success) {
      console.log('createStoreOrderSchema errors:', JSON.stringify(result.error.issues, null, 2))
    }
    expect(result.success).toBe(true)
  })

  it('allows undefined pet_id', () => {
    const result = createStoreOrderSchema.safeParse({
      clinic: 'terrapet',
      items: [
        {
          product_id: '550e8400-e29b-41d4-a716-446655440000',
          quantity: 1,
          unit_price: 1000,
        },
      ],
    })
    if (!result.success) {
      console.log('createStoreOrderSchema errors:', JSON.stringify(result.error.issues, null, 2))
    }
    expect(result.success).toBe(true)
  })
})
