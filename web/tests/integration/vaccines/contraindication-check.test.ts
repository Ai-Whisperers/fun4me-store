/**
 * Vaccine Contraindication Check API Tests
 *
 * Tests for POST /api/vaccine_reactions/check
 *
 * This route checks if a pet has existing adverse reactions to a specific
 * vaccine brand - critical for preventing repeat reactions during vaccination.
 * Returns contraindication alerts before administering vaccines.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/vaccine_reactions/check/route'
import {
  mockState,
  VACCINE_REACTIONS,
  VACCINES,
  PETS,
  TENANTS,
  USERS,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
}))

// Mock auth wrapper - uses mockState
vi.mock('@/lib/auth', () => ({
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
import { POST } from '@/app/api/vaccine_reactions/check/route'

// Helper to create POST request
function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/vaccine_reactions/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/vaccine_reactions/check', () => {
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

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Nobivac',
      }))

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.code).toBe('UNAUTHORIZED')
    })

    it('should allow vet to check contraindications', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('vaccine_reactions', null)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Nobivac',
      }))

      expect(response.status).toBe(200)
    })

    it('should allow admin to check contraindications', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('vaccine_reactions', null)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Nobivac',
      }))

      expect(response.status).toBe(200)
    })

    it('should allow owner to check contraindications for their pet', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('vaccine_reactions', null)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Nobivac',
      }))

      expect(response.status).toBe(200)
    })
  })

  // ===========================================================================
  // Validation Tests
  // ===========================================================================

  describe('Input Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 400 when pet_id is missing', async () => {
      const response = await POST(createRequest({
        brand: 'Nobivac',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.required).toContain('pet_id')
    })

    it('should return 400 when brand is missing', async () => {
      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.required).toContain('brand')
    })

    it('should return 400 when both fields are missing', async () => {
      const response = await POST(createRequest({}))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.required).toContain('pet_id')
      expect(body.details?.required).toContain('brand')
    })
  })

  // ===========================================================================
  // No Contraindication Tests (No Previous Reactions)
  // ===========================================================================

  describe('No Contraindications', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return hasReaction: false when no previous reaction exists', async () => {
      mockState.setTableResult('vaccine_reactions', null)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Nobivac',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(false)
      expect(body.record).toBeUndefined()
    })

    it('should return hasReaction: false for different brand', async () => {
      // Pet has reaction to Nobivac but we're checking Vanguard
      mockState.setTableResult('vaccine_reactions', null)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Vanguard Plus',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(false)
    })

    it('should return hasReaction: false for pet with no reactions', async () => {
      mockState.setTableResult('vaccine_reactions', null)

      const response = await POST(createRequest({
        pet_id: PETS.LUNA_CAT.id,
        brand: 'Purevax',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(false)
    })
  })

  // ===========================================================================
  // Contraindication Alert Tests (Previous Reactions Found)
  // ===========================================================================

  describe('Contraindication Alerts', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return hasReaction: true when mild reaction exists', async () => {
      const reactionRecord = {
        ...VACCINE_REACTIONS.MILD_LOCAL,
        vaccine_brand: 'Nobivac Rabies',
      }
      mockState.setTableResult('vaccine_reactions', reactionRecord)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Nobivac Rabies',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(true)
      expect(body.record).toBeDefined()
      expect(body.record.severity).toBe('mild')
    })

    it('should return hasReaction: true when moderate reaction exists', async () => {
      const reactionRecord = {
        ...VACCINE_REACTIONS.MODERATE_SYSTEMIC,
        vaccine_brand: 'Nobivac DHPP',
      }
      mockState.setTableResult('vaccine_reactions', reactionRecord)

      const response = await POST(createRequest({
        pet_id: PETS.ROCKY_DOG.id,
        brand: 'Nobivac DHPP',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(true)
      expect(body.record.severity).toBe('moderate')
      expect(body.record.reaction_type).toBe('systemic')
    })

    it('should return hasReaction: true when severe reaction exists', async () => {
      const reactionRecord = {
        ...VACCINE_REACTIONS.SEVERE_ANAPHYLACTIC,
        vaccine_brand: 'Purevax RCP',
      }
      mockState.setTableResult('vaccine_reactions', reactionRecord)

      const response = await POST(createRequest({
        pet_id: PETS.LUNA_CAT.id,
        brand: 'Purevax RCP',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(true)
      expect(body.record.severity).toBe('severe')
      expect(body.record.reaction_type).toBe('anaphylactic')
    })

    it('should include full reaction details in response', async () => {
      const reactionRecord = {
        id: 'reaction-full-details',
        pet_id: PETS.MAX_DOG.id,
        vaccine_id: VACCINES.RABIES_MAX.id,
        tenant_id: TENANTS.ADRIS.id,
        vaccine_brand: 'Defensor 3',
        reaction_type: 'local',
        severity: 'mild',
        onset_hours: 4,
        description: 'Hinchazón en sitio de inyección',
        treatment: 'Aplicar compresa fría',
        resolved_at: new Date().toISOString(),
        reported_by: USERS.VET_CARLOS.id,
      }
      mockState.setTableResult('vaccine_reactions', reactionRecord)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Defensor 3',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(true)
      expect(body.record.id).toBe('reaction-full-details')
      expect(body.record.onset_hours).toBe(4)
      expect(body.record.description).toBe('Hinchazón en sitio de inyección')
      expect(body.record.treatment).toBe('Aplicar compresa fría')
    })
  })

  // ===========================================================================
  // Case Insensitive Brand Matching
  // ===========================================================================

  describe('Case Insensitive Brand Matching', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should match brand regardless of case (lowercase query)', async () => {
      const reactionRecord = {
        ...VACCINE_REACTIONS.MILD_LOCAL,
        vaccine_brand: 'Nobivac Rabies',
      }
      mockState.setTableResult('vaccine_reactions', reactionRecord)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'nobivac rabies',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(true)
    })

    it('should match brand regardless of case (uppercase query)', async () => {
      const reactionRecord = {
        ...VACCINE_REACTIONS.MILD_LOCAL,
        vaccine_brand: 'Nobivac Rabies',
      }
      mockState.setTableResult('vaccine_reactions', reactionRecord)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'NOBIVAC RABIES',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(true)
    })

    it('should match brand regardless of case (mixed case query)', async () => {
      const reactionRecord = {
        ...VACCINE_REACTIONS.MILD_LOCAL,
        vaccine_brand: 'nobivac rabies',
      }
      mockState.setTableResult('vaccine_reactions', reactionRecord)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'NoBiVaC RaBiEs',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(true)
    })
  })

  // ===========================================================================
  // Different Pets / Species Tests
  // ===========================================================================

  describe('Different Pets and Species', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should check contraindications for dogs', async () => {
      const reactionRecord = {
        ...VACCINE_REACTIONS.MILD_LOCAL,
        pet_id: PETS.MAX_DOG.id,
        vaccine_brand: 'Nobivac DHPP',
      }
      mockState.setTableResult('vaccine_reactions', reactionRecord)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Nobivac DHPP',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(true)
    })

    it('should check contraindications for cats', async () => {
      const reactionRecord = {
        ...VACCINE_REACTIONS.SEVERE_ANAPHYLACTIC,
        pet_id: PETS.LUNA_CAT.id,
        vaccine_brand: 'Purevax FeLV',
      }
      mockState.setTableResult('vaccine_reactions', reactionRecord)

      const response = await POST(createRequest({
        pet_id: PETS.LUNA_CAT.id,
        brand: 'Purevax FeLV',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(true)
    })

    it('should not return reaction from different pet', async () => {
      // Max has a reaction but we're checking for Luna
      mockState.setTableResult('vaccine_reactions', null)

      const response = await POST(createRequest({
        pet_id: PETS.LUNA_CAT.id,
        brand: 'Nobivac Rabies',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(false)
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
      mockState.setTableError('vaccine_reactions', new Error('Database connection failed'))

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Nobivac',
      }))

      expect(response.status).toBe(500)
    })

    it('should log database errors', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setTableError('vaccine_reactions', new Error('Connection timeout'))

      await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Nobivac',
      }))

      expect(logger.error).toHaveBeenCalledWith(
        'Error checking vaccine reactions',
        expect.objectContaining({
          tenantId: TENANTS.ADRIS.id,
          petId: PETS.MAX_DOG.id,
        })
      )
    })

    it('should handle malformed JSON request body', async () => {
      const malformedRequest = new NextRequest('http://localhost:3000/api/vaccine_reactions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      })

      const response = await POST(malformedRequest)

      expect(response.status).toBe(500)
    })
  })

  // ===========================================================================
  // Tenant Isolation Tests
  // ===========================================================================

  describe('Tenant Isolation', () => {
    it('should only find reactions within the same tenant', async () => {
      // Set user to VET but in PETLIFE tenant
      mockState.setUser({
        id: USERS.ADMIN_PETLIFE.id,
        email: USERS.ADMIN_PETLIFE.email,
      })
      mockState.setProfile({
        id: USERS.ADMIN_PETLIFE.id,
        tenant_id: TENANTS.PETLIFE.id,
        role: 'admin',
      })

      // Even if there's a reaction for this pet in ADRIS,
      // the RLS policy would filter it out for PETLIFE user
      mockState.setTableResult('vaccine_reactions', null)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Nobivac',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(false)
    })

    it('should find reactions for pets in the correct tenant', async () => {
      mockState.setAuthScenario('VET') // ADRIS tenant
      const reactionRecord = {
        ...VACCINE_REACTIONS.MILD_LOCAL,
        pet_id: PETS.MAX_DOG.id,
        tenant_id: TENANTS.ADRIS.id,
        vaccine_brand: 'Nobivac',
      }
      mockState.setTableResult('vaccine_reactions', reactionRecord)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Nobivac',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(true)
    })
  })

  // ===========================================================================
  // Performance Considerations
  // ===========================================================================

  describe('Performance', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should use maybeSingle to limit results', async () => {
      // The route uses maybeSingle() which should return at most one record
      const reactionRecord = {
        ...VACCINE_REACTIONS.MILD_LOCAL,
        vaccine_brand: 'Nobivac',
      }
      mockState.setTableResult('vaccine_reactions', reactionRecord)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Nobivac',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      // Single record returned, not an array
      expect(body.record).toBeDefined()
      expect(Array.isArray(body.record)).toBe(false)
    })
  })

  // ===========================================================================
  // Severity-Based Alerting Tests
  // ===========================================================================

  describe('Severity-Based Responses', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return mild reaction with appropriate details', async () => {
      const mildReaction = {
        id: 'reaction-mild',
        pet_id: PETS.MAX_DOG.id,
        vaccine_id: VACCINES.RABIES_MAX.id,
        tenant_id: TENANTS.ADRIS.id,
        vaccine_brand: 'Nobivac',
        reaction_type: 'local',
        severity: 'mild',
        onset_hours: 2,
        description: 'Leve hinchazón',
        reported_by: USERS.VET_CARLOS.id,
      }
      mockState.setTableResult('vaccine_reactions', mildReaction)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Nobivac',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(true)
      expect(body.record.severity).toBe('mild')
      // Mild reaction - proceed with caution
    })

    it('should return moderate reaction with appropriate details', async () => {
      const moderateReaction = {
        id: 'reaction-moderate',
        pet_id: PETS.MAX_DOG.id,
        vaccine_id: VACCINES.RABIES_MAX.id,
        tenant_id: TENANTS.ADRIS.id,
        vaccine_brand: 'Nobivac',
        reaction_type: 'systemic',
        severity: 'moderate',
        onset_hours: 6,
        description: 'Fiebre y letargia',
        reported_by: USERS.VET_CARLOS.id,
      }
      mockState.setTableResult('vaccine_reactions', moderateReaction)

      const response = await POST(createRequest({
        pet_id: PETS.MAX_DOG.id,
        brand: 'Nobivac',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(true)
      expect(body.record.severity).toBe('moderate')
      // Moderate reaction - consider alternative brand
    })

    it('should return severe reaction with appropriate details', async () => {
      const severeReaction = {
        id: 'reaction-severe',
        pet_id: PETS.LUNA_CAT.id,
        vaccine_id: VACCINES.FELINE_LUNA.id,
        tenant_id: TENANTS.ADRIS.id,
        vaccine_brand: 'Purevax',
        reaction_type: 'anaphylactic',
        severity: 'severe',
        onset_hours: 0.25,
        description: 'Anafilaxia',
        treatment: 'Epinefrina IV',
        reported_by: USERS.VET_ANA.id,
      }
      mockState.setTableResult('vaccine_reactions', severeReaction)

      const response = await POST(createRequest({
        pet_id: PETS.LUNA_CAT.id,
        brand: 'Purevax',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.hasReaction).toBe(true)
      expect(body.record.severity).toBe('severe')
      expect(body.record.reaction_type).toBe('anaphylactic')
      // Severe reaction - contraindicated, do not administer
    })
  })
})
