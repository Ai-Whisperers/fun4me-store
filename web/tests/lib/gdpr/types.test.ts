/**
 * GDPR Types Tests
 *
 * COMP-001: Tests for GDPR type definitions
 */

import { describe, it, expect } from 'vitest'
import { DATA_CATEGORIES } from '../../../lib/gdpr/types'

describe('GDPR Types', () => {
  describe('DATA_CATEGORIES', () => {
    it('defines deletable categories', () => {
      expect(DATA_CATEGORIES.deletable).toBeInstanceOf(Array)
      expect(DATA_CATEGORIES.deletable.length).toBeGreaterThan(0)
      expect(DATA_CATEGORIES.deletable).toContain('messages')
      expect(DATA_CATEGORIES.deletable).toContain('store_cart')
      expect(DATA_CATEGORIES.deletable).toContain('store_wishlist')
    })

    it('defines anonymizable categories', () => {
      expect(DATA_CATEGORIES.anonymizable).toBeInstanceOf(Array)
      expect(DATA_CATEGORIES.anonymizable.length).toBeGreaterThan(0)
      expect(DATA_CATEGORIES.anonymizable).toContain('profile')
      expect(DATA_CATEGORIES.anonymizable).toContain('medical_records')
      expect(DATA_CATEGORIES.anonymizable).toContain('invoices')
    })

    it('defines retained categories with reasons', () => {
      expect(DATA_CATEGORIES.retained).toBeInstanceOf(Array)
      expect(DATA_CATEGORIES.retained.length).toBeGreaterThan(0)

      // Each retained category should have required fields
      DATA_CATEGORIES.retained.forEach((item) => {
        expect(item).toHaveProperty('category')
        expect(item).toHaveProperty('reason')
        expect(item).toHaveProperty('retentionPeriod')
        expect(typeof item.category).toBe('string')
        expect(typeof item.reason).toBe('string')
        expect(typeof item.retentionPeriod).toBe('string')
      })
    })

    it('includes medical_records in retained categories', () => {
      const medicalRecords = DATA_CATEGORIES.retained.find(
        (item) => item.category === 'medical_records'
      )
      expect(medicalRecords).toBeDefined()
      expect(medicalRecords?.retentionPeriod).toBe('10 años')
    })

    it('includes invoices in retained categories', () => {
      const invoices = DATA_CATEGORIES.retained.find(
        (item) => item.category === 'invoices'
      )
      expect(invoices).toBeDefined()
      expect(invoices?.retentionPeriod).toBe('5 años')
    })

    it('categories do not overlap between deletable and anonymizable', () => {
      const deletableSet = new Set(DATA_CATEGORIES.deletable)
      const overlap = DATA_CATEGORIES.anonymizable.filter((cat) =>
        deletableSet.has(cat)
      )
      expect(overlap).toHaveLength(0)
    })

    it('all retained categories are in anonymizable list', () => {
      const anonymizableSet = new Set(DATA_CATEGORIES.anonymizable)
      DATA_CATEGORIES.retained.forEach((item) => {
        expect(
          anonymizableSet.has(item.category),
          `${item.category} should be in anonymizable list`
        ).toBe(true)
      })
    })
  })
})
