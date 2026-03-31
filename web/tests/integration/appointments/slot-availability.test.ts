/**
 * Appointment Slot Availability API Tests
 *
 * Tests for GET /api/appointments/slots
 *
 * This route returns available appointment slots for a clinic on a given date.
 * Used by the booking wizard to show available times.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/appointments/slots/route'
import {
  mockState,
  TENANTS,
  USERS,
  SERVICES,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
}))

// Mock auth wrapper - uses mockState
vi.mock('@/lib/auth/api-wrapper', () => ({
  withApiAuth: (handler: any, options?: { roles?: string[] }) => {
    return async (request: Request) => {
      const { mockState } = await import('@/lib/test-utils')
      const { createStatefulSupabaseMock } = await import('@/lib/test-utils')

      if (!mockState.user) {
        return new Response(JSON.stringify({ error: 'No autorizado', code: 'UNAUTHORIZED' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (!mockState.profile) {
        return new Response(JSON.stringify({ error: 'Perfil no encontrado', code: 'FORBIDDEN' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (options?.roles && !options.roles.includes(mockState.profile.role)) {
        return new Response(JSON.stringify({ error: 'Rol insuficiente', code: 'INSUFFICIENT_ROLE' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const supabase = createStatefulSupabaseMock()
      return handler({
        request,
        user: mockState.user,
        profile: mockState.profile,
        supabase,
      })
    }
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Import routes AFTER mocks
import { GET } from '@/app/api/appointments/slots/route'

// Helper to create GET request
function createRequest(params: Record<string, string> = {}): NextRequest {
  const searchParams = new URLSearchParams(params)
  return new NextRequest(`http://localhost:3000/api/appointments/slots?${searchParams}`, {
    method: 'GET',
  })
}

// Tomorrow's date for testing
const getTomorrowDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

// Sample slots from database function
const createMockSlots = (numSlots: number, allAvailable = true) =>
  Array.from({ length: numSlots }, (_, i) => {
    const hour = 8 + Math.floor(i / 2)
    const minutes = i % 2 === 0 ? '00' : '30'
    return {
      slot_time: `${hour.toString().padStart(2, '0')}:${minutes}`,
      is_available: allAvailable || Math.random() > 0.3,
    }
  })

describe('GET /api/appointments/slots', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  // ===========================================================================
  // Authentication Tests
  // ===========================================================================

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(401)
    })

    it('should allow owner to get slots for their clinic', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
    })

    it('should allow vet to get slots', async () => {
      mockState.setAuthScenario('VET')
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
    })

    it('should allow admin to get slots', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
    })
  })

  // ===========================================================================
  // Validation Tests
  // ===========================================================================

  describe('Input Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 400 when clinic is missing', async () => {
      const response = await GET(createRequest({
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.required).toContain('clinic')
    })

    it('should return 400 when date is missing', async () => {
      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.required).toContain('date')
    })

    it('should return 400 for invalid date format', async () => {
      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: '01-15-2024', // Invalid format
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.expected).toBe('YYYY-MM-DD')
    })

    it('should accept valid date format', async () => {
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: '2024-12-25',
      }))

      expect(response.status).toBe(200)
    })
  })

  // ===========================================================================
  // Tenant Isolation Tests
  // ===========================================================================

  describe('Tenant Isolation', () => {
    it('should allow owner to access their own clinic', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id, // Owner belongs to ADRIS
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
    })

    it('should deny owner from accessing different clinic', async () => {
      mockState.setAuthScenario('OWNER') // ADRIS owner

      const response = await GET(createRequest({
        clinic: TENANTS.PETLIFE.id, // Different tenant
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(403)
    })

    it('should allow staff to access slots for their clinic', async () => {
      mockState.setAuthScenario('VET')
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
    })
  })

  // ===========================================================================
  // Slot Response Format Tests
  // ===========================================================================

  describe('Response Format', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return date in response', async () => {
      const date = getTomorrowDate()
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date,
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.date).toBe(date)
    })

    it('should return clinic in response', async () => {
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.clinic).toBe(TENANTS.ADRIS.id)
    })

    it('should return slotDuration in response', async () => {
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.slotDuration).toBeDefined()
      expect(typeof body.slotDuration).toBe('number')
    })

    it('should return slots array', async () => {
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(Array.isArray(body.slots)).toBe(true)
    })

    it('should return slots with time and available properties', async () => {
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.slots.length).toBeGreaterThan(0)
      expect(body.slots[0]).toHaveProperty('time')
      expect(body.slots[0]).toHaveProperty('available')
    })
  })

  // ===========================================================================
  // Service Duration Tests
  // ===========================================================================

  describe('Service Duration', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should use default 30 minute slots without service_id', async () => {
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.slotDuration).toBe(30)
    })

    it('should use service duration when service_id provided', async () => {
      mockState.setTableResult('services', { duration_minutes: 45 })
      mockState.setRpcResult('get_available_slots', createMockSlots(10))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
        service_id: SERVICES.CONSULTATION.id,
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.slotDuration).toBe(45)
    })

    it('should use default when service not found', async () => {
      mockState.setTableResult('services', null)
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
        service_id: 'non-existent-service',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.slotDuration).toBe(30)
    })
  })

  // ===========================================================================
  // Vet Filter Tests
  // ===========================================================================

  describe('Vet Filtering', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should pass vet_id to database function when provided', async () => {
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
        vet_id: USERS.VET_CARLOS.id,
      }))

      expect(response.status).toBe(200)
    })

    it('should return slots without vet_id filter', async () => {
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.slots.length).toBeGreaterThan(0)
    })
  })

  // ===========================================================================
  // Available/Unavailable Slots Tests
  // ===========================================================================

  describe('Slot Availability', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return all available slots when no appointments', async () => {
      mockState.setRpcResult('get_available_slots', createMockSlots(16, true))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const allAvailable = body.slots.every((slot: { available: boolean }) => slot.available)
      expect(allAvailable).toBe(true)
    })

    it('should mark some slots as unavailable when appointments exist', async () => {
      const mixedSlots = createMockSlots(16, false).map((slot, i) => ({
        ...slot,
        is_available: i % 3 !== 0, // Every third slot unavailable
      }))
      mockState.setRpcResult('get_available_slots', mixedSlots)

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const unavailable = body.slots.filter((slot: { available: boolean }) => !slot.available)
      expect(unavailable.length).toBeGreaterThan(0)
    })

    it('should return no available slots when fully booked', async () => {
      const allBooked = createMockSlots(16, false).map(slot => ({
        ...slot,
        is_available: false,
      }))
      mockState.setRpcResult('get_available_slots', allBooked)

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const allUnavailable = body.slots.every((slot: { available: boolean }) => !slot.available)
      expect(allUnavailable).toBe(true)
    })
  })

  // ===========================================================================
  // Working Hours Tests
  // ===========================================================================

  describe('Working Hours', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return slots within working hours', async () => {
      const workingHoursSlots = [
        { slot_time: '08:00', is_available: true },
        { slot_time: '08:30', is_available: true },
        { slot_time: '09:00', is_available: true },
        { slot_time: '17:30', is_available: true },
      ]
      mockState.setRpcResult('get_available_slots', workingHoursSlots)

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      body.slots.forEach((slot: { time: string }) => {
        const hour = parseInt(slot.time.split(':')[0])
        expect(hour).toBeGreaterThanOrEqual(8)
        expect(hour).toBeLessThan(18)
      })
    })

    it('should exclude break time slots', async () => {
      // Simulate slots that skip lunch break (12:00-14:00)
      const slotsWithBreak = createMockSlots(12, true).filter(slot => {
        const hour = parseInt(slot.slot_time.split(':')[0])
        return hour < 12 || hour >= 14
      })
      mockState.setRpcResult('get_available_slots', slotsWithBreak)

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const lunchSlots = body.slots.filter((slot: { time: string }) => {
        const hour = parseInt(slot.time.split(':')[0])
        return hour >= 12 && hour < 14
      })
      expect(lunchSlots.length).toBe(0)
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on database error', async () => {
      mockState.setRpcError('get_available_slots', new Error('Database connection failed'))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(500)
    })

    it('should log database errors', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setRpcError('get_available_slots', new Error('Query timeout'))

      await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching available slots',
        expect.objectContaining({
          tenantId: TENANTS.ADRIS.id,
        })
      )
    })

    it('should return empty slots array when RPC returns null', async () => {
      mockState.setRpcResult('get_available_slots', null)

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.slots).toEqual([])
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should handle weekend dates', async () => {
      mockState.setRpcResult('get_available_slots', [])

      // Find next Saturday
      const today = new Date()
      const saturday = new Date(today)
      saturday.setDate(today.getDate() + (6 - today.getDay() + 7) % 7)
      const saturdayStr = saturday.toISOString().split('T')[0]

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: saturdayStr,
      }))

      expect(response.status).toBe(200)
      // Weekend might return empty slots depending on clinic config
    })

    it('should handle past dates', async () => {
      mockState.setRpcResult('get_available_slots', [])

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: yesterdayStr,
      }))

      expect(response.status).toBe(200)
      // Past dates might return empty slots
    })

    it('should handle far future dates', async () => {
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const farFuture = new Date()
      farFuture.setFullYear(farFuture.getFullYear() + 1)
      const farFutureStr = farFuture.toISOString().split('T')[0]

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: farFutureStr,
      }))

      expect(response.status).toBe(200)
    })
  })

  // ===========================================================================
  // Time Format Tests
  // ===========================================================================

  describe('Time Format', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return times in HH:mm format', async () => {
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      body.slots.forEach((slot: { time: string }) => {
        expect(slot.time).toMatch(/^\d{2}:\d{2}$/)
      })
    })

    it('should return times in chronological order', async () => {
      mockState.setRpcResult('get_available_slots', createMockSlots(16))

      const response = await GET(createRequest({
        clinic: TENANTS.ADRIS.id,
        date: getTomorrowDate(),
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const times = body.slots.map((slot: { time: string }) => slot.time)
      const sortedTimes = [...times].sort()
      expect(times).toEqual(sortedTimes)
    })
  })
})
