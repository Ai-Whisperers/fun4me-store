/**
 * Privacy Acceptance API Tests
 *
 * COMP-002: Tests for privacy policy acceptance endpoints
 *
 * Tests for:
 * - GET /api/privacy/status - Get acceptance status
 * - POST /api/privacy/accept - Accept policy
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  mockState,
  TENANTS,
  USERS,
  resetAllMocks, getSupabaseServerMock,
  getAuthMock,
} from '@/lib/test-utils'

// Mock data
const MOCK_POLICY = {
  id: 'policy-1',
  tenantId: TENANTS.ADRIS,
  version: '1.0',
  status: 'published' as const,
  effectiveDate: '2024-01-01',
  contentEs: '<p>Política de privacidad</p>',
  changeSummary: [],
  requiresReacceptance: false,
  createdBy: USERS.ADMIN.id,
  createdAt: '2024-01-01T00:00:00Z'}

const MOCK_POLICY_V2 = {
  id: 'policy-2',
  tenantId: TENANTS.ADRIS,
  version: '2.0',
  status: 'published' as const,
  effectiveDate: '2024-06-01',
  contentEs: '<p>Política de privacidad actualizada</p>',
  changeSummary: ['Cambio importante'],
  requiresReacceptance: true,
  previousVersionId: 'policy-1',
  createdBy: USERS.ADMIN.id,
  createdAt: '2024-06-01T00:00:00Z'}

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => getSupabaseServerMock())

// Mock auth wrapper
vi.mock('@/lib/auth', () => getAuthMock())
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 10 }),
  RATE_LIMITS: { api: { standard: { requests: 100, window: '1m' } } },
}))
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock API error helpers
vi.mock('@/lib/api/errors', () => ({
  apiError: (code: string, status: number, options?: { details?: Record<string, unknown> }) => {
    const { NextResponse } = require('next/server')
    return NextResponse.json(
      { error: code, code, ...options?.details },
      { status }
    )
  },
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500}}))

// State for acceptance tests
let userHasAccepted = false
let currentPolicy = MOCK_POLICY

// Mock privacy service
vi.mock('@/lib/privacy', async () => {
  const actual = await vi.importActual('@/lib/privacy')
  return {
    ...actual,
    getAcceptanceStatus: vi.fn().mockImplementation(async (userId: string, tenantId: string) => {
      if (userHasAccepted) {
        return {
          hasAccepted: true,
          acceptedVersion: currentPolicy.version,
          acceptedAt: new Date().toISOString(),
          currentVersion: currentPolicy.version,
          needsReacceptance: false}
      }

      return {
        hasAccepted: false,
        currentVersion: currentPolicy.version,
        needsReacceptance: true,
        policy: currentPolicy}
    }),
    getPolicyById: vi.fn().mockImplementation(async (policyId: string) => {
      if (policyId === currentPolicy.id) {
        return currentPolicy
      }
      return null
    }),
    acceptPolicy: vi.fn().mockImplementation(
      async (userId: string, tenantId: string, input: any, ip?: string, userAgent?: string) => {
        if (userHasAccepted) {
          throw new Error('Ya aceptaste esta versión de la política')
        }

        userHasAccepted = true
        return {
          id: 'acceptance-1',
          userId,
          tenantId,
          policyId: input.policyId,
          policyVersion: currentPolicy.version,
          acceptedAt: new Date().toISOString(),
          acceptanceMethod: input.acceptanceMethod,
          locationContext: input.locationContext,
          ipAddress: ip,
          userAgent}
      }
    )}
})


// Import routes AFTER mocks
import { GET } from '@/app/api/privacy/status/route'
import { POST } from '@/app/api/privacy/accept/route'

// Helper functions
function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/privacy/status')
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/privacy/accept', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '192.168.1.1',
      'user-agent': 'Mozilla/5.0 Test Browser'},
    body: JSON.stringify(body)})
}

describe('Privacy Acceptance API', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
    userHasAccepted = false
    currentPolicy = MOCK_POLICY
  })

  describe('GET /api/privacy/status', () => {
    it('should return acceptance status for authenticated user', async () => {
      mockState.setUser(USERS.OWNER)
      mockState.setProfile({
        id: USERS.OWNER.id,
        tenant_id: TENANTS.ADRIS,
        role: 'owner',
        full_name: 'Test Owner',
        email: USERS.OWNER.email})

      const response = await GET(createGetRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('hasAccepted')
      expect(data).toHaveProperty('currentVersion')
      expect(data).toHaveProperty('needsReacceptance')
    })

    it('should indicate need for acceptance when user has not accepted', async () => {
      mockState.setUser(USERS.OWNER)
      mockState.setProfile({
        id: USERS.OWNER.id,
        tenant_id: TENANTS.ADRIS,
        role: 'owner',
        full_name: 'Test Owner',
        email: USERS.OWNER.email})

      const response = await GET(createGetRequest())
      const data = await response.json()

      expect(data.hasAccepted).toBe(false)
      expect(data.needsReacceptance).toBe(true)
      expect(data.policy).toBeTruthy()
    })

    it('should indicate acceptance when user has accepted', async () => {
      userHasAccepted = true
      mockState.setUser(USERS.OWNER)
      mockState.setProfile({
        id: USERS.OWNER.id,
        tenant_id: TENANTS.ADRIS,
        role: 'owner',
        full_name: 'Test Owner',
        email: USERS.OWNER.email})

      const response = await GET(createGetRequest())
      const data = await response.json()

      expect(data.hasAccepted).toBe(true)
      expect(data.needsReacceptance).toBe(false)
    })

    it('should require authentication', async () => {
      mockState.setUser(null)
      mockState.setProfile(null)

      const response = await GET(createGetRequest())

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/privacy/accept', () => {
    it('should accept policy for authenticated user', async () => {
      mockState.setUser(USERS.OWNER)
      mockState.setProfile({
        id: USERS.OWNER.id,
        tenant_id: TENANTS.ADRIS,
        role: 'owner',
        full_name: 'Test Owner',
        email: USERS.OWNER.email})

      const response = await POST(
        createPostRequest({
          policyId: MOCK_POLICY.id,
          acceptanceMethod: 'button',
          locationContext: 'policy_update'})
      )

      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.policyId).toBe(MOCK_POLICY.id)
      expect(data.acceptanceMethod).toBe('button')
    })

    it('should reject missing policyId', async () => {
      mockState.setUser(USERS.OWNER)
      mockState.setProfile({
        id: USERS.OWNER.id,
        tenant_id: TENANTS.ADRIS,
        role: 'owner',
        full_name: 'Test Owner',
        email: USERS.OWNER.email})

      const response = await POST(
        createPostRequest({
          acceptanceMethod: 'button'})
      )

      expect(response.status).toBe(400)
    })

    it('should reject invalid acceptance method', async () => {
      mockState.setUser(USERS.OWNER)
      mockState.setProfile({
        id: USERS.OWNER.id,
        tenant_id: TENANTS.ADRIS,
        role: 'owner',
        full_name: 'Test Owner',
        email: USERS.OWNER.email})

      const response = await POST(
        createPostRequest({
          policyId: MOCK_POLICY.id,
          acceptanceMethod: 'invalid_method'})
      )

      expect(response.status).toBe(400)
    })

    it('should reject duplicate acceptance', async () => {
      userHasAccepted = true
      mockState.setUser(USERS.OWNER)
      mockState.setProfile({
        id: USERS.OWNER.id,
        tenant_id: TENANTS.ADRIS,
        role: 'owner',
        full_name: 'Test Owner',
        email: USERS.OWNER.email})

      const response = await POST(
        createPostRequest({
          policyId: MOCK_POLICY.id,
          acceptanceMethod: 'button'})
      )

      expect(response.status).toBe(400)
    })

    it('should require authentication', async () => {
      mockState.setUser(null)
      mockState.setProfile(null)

      const response = await POST(
        createPostRequest({
          policyId: MOCK_POLICY.id,
          acceptanceMethod: 'button'})
      )

      expect(response.status).toBe(401)
    })
  })
})
