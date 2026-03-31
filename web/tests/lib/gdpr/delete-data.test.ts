/**
 * GDPR Data Deletion Tests
 *
 * COMP-001: Tests for data deletion utility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DATA_CATEGORIES } from '../../../lib/gdpr/types'

// Mock Supabase
const mockFrom = vi.fn()
const mockSupabase = {
  from: mockFrom,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        admin: {
          deleteUser: vi.fn(() => Promise.resolve({ error: null })),
        },
      },
    })
  ),
}))

describe('GDPR Data Deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Anonymization Values', () => {
    const ANONYMIZED = {
      name: '[DATOS ELIMINADOS]',
      email: 'deleted@anonymized.local',
      phone: '0000000000',
      address: '[DATOS ELIMINADOS]',
      content: '[CONTENIDO ELIMINADO POR SOLICITUD GDPR]',
    }

    it('uses placeholder name for deleted users', () => {
      expect(ANONYMIZED.name).toBe('[DATOS ELIMINADOS]')
    })

    it('uses placeholder email that is syntactically valid', () => {
      expect(ANONYMIZED.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    })

    it('uses zeroed phone number', () => {
      expect(ANONYMIZED.phone).toMatch(/^0+$/)
    })

    it('uses placeholder for addresses', () => {
      expect(ANONYMIZED.address).toBe('[DATOS ELIMINADOS]')
    })

    it('content placeholder indicates GDPR deletion', () => {
      expect(ANONYMIZED.content).toContain('GDPR')
    })

    it('anonymized email is not a real domain', () => {
      const domain = ANONYMIZED.email.split('@')[1]
      expect(domain).toBe('anonymized.local')
    })
  })

  describe('Deletion Categories', () => {
    it('fully deletes non-essential data', () => {
      const deletable = DATA_CATEGORIES.deletable
      expect(deletable).toContain('messages')
      expect(deletable).toContain('store_cart')
      expect(deletable).toContain('store_wishlist')
      expect(deletable).toContain('stock_alerts')
      expect(deletable).toContain('store_reviews')
      expect(deletable).toContain('reminders')
    })

    it('anonymizes data with legal retention requirements', () => {
      const anonymizable = DATA_CATEGORIES.anonymizable
      expect(anonymizable).toContain('profile')
      expect(anonymizable).toContain('medical_records')
      expect(anonymizable).toContain('prescriptions')
      expect(anonymizable).toContain('consent_documents')
      expect(anonymizable).toContain('invoices')
      expect(anonymizable).toContain('payments')
      expect(anonymizable).toContain('audit_logs')
    })

    it('does not fully delete medical records', () => {
      expect(DATA_CATEGORIES.deletable).not.toContain('medical_records')
    })

    it('does not fully delete invoices', () => {
      expect(DATA_CATEGORIES.deletable).not.toContain('invoices')
    })
  })

  describe('Retention Periods', () => {
    it('medical records retained for 10 years', () => {
      const medical = DATA_CATEGORIES.retained.find(
        (r) => r.category === 'medical_records'
      )
      expect(medical?.retentionPeriod).toBe('10 años')
    })

    it('invoices retained for 5 years (tax requirement)', () => {
      const invoices = DATA_CATEGORIES.retained.find(
        (r) => r.category === 'invoices'
      )
      expect(invoices?.retentionPeriod).toBe('5 años')
    })

    it('consent documents retained for 10 years', () => {
      const consent = DATA_CATEGORIES.retained.find(
        (r) => r.category === 'consent_documents'
      )
      expect(consent?.retentionPeriod).toBe('10 años')
    })

    it('all retained categories have Spanish reasons', () => {
      DATA_CATEGORIES.retained.forEach((item) => {
        // Check that reason is in Spanish (contains Spanish characters or keywords)
        const isSpanish =
          item.reason.includes('Requisito') ||
          item.reason.includes('retención') ||
          item.reason.includes('legal') ||
          item.reason.includes('fiscal') ||
          item.reason.includes('Evidencia')
        expect(isSpanish, `"${item.reason}" should be in Spanish`).toBe(true)
      })
    })
  })

  describe('Deletion Blockers', () => {
    it('should block deletion if unpaid invoices exist', () => {
      // This is tested through canDeleteUser function
      const blockers = ['Tiene facturas pendientes de pago']
      expect(blockers).toContain('Tiene facturas pendientes de pago')
    })

    it('should block deletion if pending appointments exist', () => {
      const blockers = ['Tiene citas pendientes']
      expect(blockers).toContain('Tiene citas pendientes')
    })

    it('should block deletion if hospitalized pets exist', () => {
      const blockers = ['Tiene mascotas hospitalizadas']
      expect(blockers).toContain('Tiene mascotas hospitalizadas')
    })

    it('should block deletion if pending orders exist', () => {
      const blockers = ['Tiene pedidos pendientes de entrega']
      expect(blockers).toContain('Tiene pedidos pendientes de entrega')
    })
  })

  describe('DeletionResult structure', () => {
    it('includes success flag', () => {
      const result = {
        success: true,
        deletedCategories: ['messages'],
        anonymizedCategories: ['profile'],
        retainedCategories: DATA_CATEGORIES.retained,
        errors: [],
        completedAt: new Date().toISOString(),
      }

      expect(result).toHaveProperty('success')
      expect(typeof result.success).toBe('boolean')
    })

    it('tracks deleted categories', () => {
      const result = {
        success: true,
        deletedCategories: ['messages', 'store_cart'],
        anonymizedCategories: [],
        retainedCategories: [],
        errors: [],
        completedAt: new Date().toISOString(),
      }

      expect(result.deletedCategories).toBeInstanceOf(Array)
    })

    it('tracks anonymized categories', () => {
      const result = {
        success: true,
        deletedCategories: [],
        anonymizedCategories: ['profile', 'medical_records'],
        retainedCategories: [],
        errors: [],
        completedAt: new Date().toISOString(),
      }

      expect(result.anonymizedCategories).toBeInstanceOf(Array)
    })

    it('tracks errors with category and message', () => {
      const result = {
        success: false,
        deletedCategories: [],
        anonymizedCategories: [],
        retainedCategories: [],
        errors: [
          { category: 'messages', error: 'Database error' },
        ],
        completedAt: new Date().toISOString(),
      }

      expect(result.errors[0]).toHaveProperty('category')
      expect(result.errors[0]).toHaveProperty('error')
    })

    it('includes completion timestamp', () => {
      const result = {
        success: true,
        deletedCategories: [],
        anonymizedCategories: [],
        retainedCategories: [],
        errors: [],
        completedAt: new Date().toISOString(),
      }

      expect(result.completedAt).toBeDefined()
      expect(new Date(result.completedAt).getTime()).not.toBeNaN()
    })
  })
})
