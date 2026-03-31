/**
 * GDPR Data Collection Tests
 *
 * COMP-001: Tests for data collection utility
 */

import { describe, it, expect, vi } from 'vitest'
import { generateExportJson, calculateExportSize } from '../../../lib/gdpr/collect-data'
import type { UserDataExport } from '../../../lib/gdpr/types'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          in: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  })),
}))

describe('GDPR Data Collection', () => {
  describe('generateExportJson', () => {
    const mockExportData: UserDataExport = {
      exportedAt: '2026-01-10T12:00:00.000Z',
      format: 'json',
      dataSubject: {
        userId: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        tenantId: 'tenant-123',
        tenantName: 'Test Clinic',
        role: 'owner',
        accountCreatedAt: '2025-01-01T00:00:00.000Z',
      },
      profile: {
        id: 'user-123',
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '+595991234567',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2026-01-10T00:00:00.000Z',
      },
      pets: [
        {
          id: 'pet-1',
          name: 'Max',
          species: 'dog',
          breed: 'Labrador',
          dateOfBirth: '2020-05-15',
          gender: 'male',
          weight: 30,
          isDeceased: false,
          createdAt: '2025-01-15T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      appointments: [],
      medicalRecords: [],
      prescriptions: [],
      invoices: [],
      payments: [],
      messages: [],
      loyaltyPoints: null,
      storeOrders: [],
      storeReviews: [],
      consents: [],
      activityLog: [],
    }

    it('generates valid JSON string', () => {
      const json = generateExportJson(mockExportData)
      expect(() => JSON.parse(json)).not.toThrow()
    })

    it('includes all data categories', () => {
      const json = generateExportJson(mockExportData)
      const parsed = JSON.parse(json)

      expect(parsed).toHaveProperty('exportedAt')
      expect(parsed).toHaveProperty('format', 'json')
      expect(parsed).toHaveProperty('dataSubject')
      expect(parsed).toHaveProperty('profile')
      expect(parsed).toHaveProperty('pets')
      expect(parsed).toHaveProperty('appointments')
      expect(parsed).toHaveProperty('medicalRecords')
      expect(parsed).toHaveProperty('prescriptions')
      expect(parsed).toHaveProperty('invoices')
      expect(parsed).toHaveProperty('payments')
      expect(parsed).toHaveProperty('messages')
      expect(parsed).toHaveProperty('loyaltyPoints')
      expect(parsed).toHaveProperty('storeOrders')
      expect(parsed).toHaveProperty('storeReviews')
      expect(parsed).toHaveProperty('consents')
      expect(parsed).toHaveProperty('activityLog')
    })

    it('preserves data subject information', () => {
      const json = generateExportJson(mockExportData)
      const parsed = JSON.parse(json)

      expect(parsed.dataSubject.userId).toBe('user-123')
      expect(parsed.dataSubject.email).toBe('test@example.com')
      expect(parsed.dataSubject.fullName).toBe('Test User')
      expect(parsed.dataSubject.tenantName).toBe('Test Clinic')
    })

    it('preserves pet data', () => {
      const json = generateExportJson(mockExportData)
      const parsed = JSON.parse(json)

      expect(parsed.pets).toHaveLength(1)
      expect(parsed.pets[0].name).toBe('Max')
      expect(parsed.pets[0].species).toBe('dog')
      expect(parsed.pets[0].breed).toBe('Labrador')
    })

    it('formats JSON with indentation', () => {
      const json = generateExportJson(mockExportData)
      // Formatted JSON has newlines and spaces
      expect(json).toContain('\n')
      expect(json.split('\n').length).toBeGreaterThan(5)
    })
  })

  describe('calculateExportSize', () => {
    const mockExportData: UserDataExport = {
      exportedAt: '2026-01-10T12:00:00.000Z',
      format: 'json',
      dataSubject: {
        userId: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        tenantId: 'tenant-123',
        tenantName: 'Test Clinic',
        role: 'owner',
        accountCreatedAt: '2025-01-01T00:00:00.000Z',
      },
      profile: null,
      pets: [],
      appointments: [],
      medicalRecords: [],
      prescriptions: [],
      invoices: [],
      payments: [],
      messages: [],
      loyaltyPoints: null,
      storeOrders: [],
      storeReviews: [],
      consents: [],
      activityLog: [],
    }

    it('returns size in bytes', () => {
      const size = calculateExportSize(mockExportData)
      expect(typeof size).toBe('number')
      expect(size).toBeGreaterThan(0)
    })

    it('increases with more data', () => {
      const smallSize = calculateExportSize(mockExportData)

      const largerData: UserDataExport = {
        ...mockExportData,
        pets: Array(10).fill({
          id: 'pet-1',
          name: 'Max',
          species: 'dog',
          breed: 'Labrador',
          isDeceased: false,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      }

      const largeSize = calculateExportSize(largerData)
      expect(largeSize).toBeGreaterThan(smallSize)
    })

    it('matches actual JSON string size', () => {
      const size = calculateExportSize(mockExportData)
      const json = generateExportJson(mockExportData)
      const actualSize = new Blob([json]).size

      expect(size).toBe(actualSize)
    })
  })
})
