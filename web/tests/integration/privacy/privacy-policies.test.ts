/**
 * Privacy Policy API Tests
 *
 * COMP-002: Tests for privacy policy management endpoints
 *
 * Tests for:
 * - GET /api/privacy - List policies
 * - POST /api/privacy - Create policy draft
 * - GET /api/privacy/[id] - Get policy by ID
 * - PATCH /api/privacy/[id] - Update draft policy
 * - DELETE /api/privacy/[id] - Delete draft policy
 * - POST /api/privacy/[id]/publish - Publish policy
 * - POST /api/privacy/[id]/archive - Archive policy
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
const MOCK_POLICIES = [
  {
    id: 'policy-1',
    tenant_id: TENANTS.ADRIS,
    version: '1.0',
    status: 'published',
    effective_date: '2024-01-01',
    content_es: '<p>Política de privacidad versión 1.0</p>',
    content_en: null,
    change_summary: [],
    requires_reacceptance: false,
    previous_version_id: null,
    created_by: USERS.ADMIN.id,
    created_at: '2024-01-01T00:00:00Z',
    published_at: '2024-01-01T00:00:00Z',
    published_by: USERS.ADMIN.id},
  {
    id: 'policy-2',
    tenant_id: TENANTS.ADRIS,
    version: '2.0',
    status: 'draft',
    effective_date: '2024-06-01',
    content_es: '<p>Política de privacidad versión 2.0</p>',
    content_en: '<p>Privacy policy version 2.0</p>',
    change_summary: ['Actualización de términos', 'Nuevos derechos de usuarios'],
    requires_reacceptance: true,
    previous_version_id: 'policy-1',
    created_by: USERS.ADMIN.id,
    created_at: '2024-05-01T00:00:00Z',
    published_at: null,
    published_by: null},
]

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
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500}}))

// Mock privacy service
vi.mock('@/lib/privacy', async () => {
  const actual = await vi.importActual('@/lib/privacy')
  return {
    ...actual,
    getCurrentPolicy: vi.fn().mockImplementation(async (tenantId: string) => {
      const policy = MOCK_POLICIES.find(
        (p) => p.tenant_id === tenantId && p.status === 'published'
      )
      if (!policy) return null
      return {
        id: policy.id,
        tenantId: policy.tenant_id,
        version: policy.version,
        status: policy.status,
        effectiveDate: policy.effective_date,
        contentEs: policy.content_es,
        contentEn: policy.content_en,
        changeSummary: policy.change_summary,
        requiresReacceptance: policy.requires_reacceptance,
        previousVersionId: policy.previous_version_id,
        createdBy: policy.created_by,
        createdAt: policy.created_at,
        publishedAt: policy.published_at,
        publishedBy: policy.published_by}
    }),
    getAllPolicies: vi.fn().mockImplementation(async (tenantId: string) => {
      return MOCK_POLICIES.filter((p) => p.tenant_id === tenantId).map((policy) => ({
        id: policy.id,
        tenantId: policy.tenant_id,
        version: policy.version,
        status: policy.status,
        effectiveDate: policy.effective_date,
        contentEs: policy.content_es,
        contentEn: policy.content_en,
        changeSummary: policy.change_summary,
        requiresReacceptance: policy.requires_reacceptance,
        previousVersionId: policy.previous_version_id,
        createdBy: policy.created_by,
        createdAt: policy.created_at,
        publishedAt: policy.published_at,
        publishedBy: policy.published_by}))
    }),
    createPolicy: vi.fn().mockImplementation(async (tenantId: string, userId: string, input: any) => {
      return {
        id: 'new-policy-id',
        tenantId,
        version: input.version,
        status: 'draft',
        effectiveDate: input.effectiveDate,
        contentEs: input.contentEs,
        contentEn: input.contentEn,
        changeSummary: input.changeSummary,
        requiresReacceptance: input.requiresReacceptance,
        previousVersionId: input.previousVersionId,
        createdBy: userId,
        createdAt: new Date().toISOString()}
    })}
})


// Import routes AFTER mocks
import { GET, POST } from '@/app/api/privacy/route'

// Helper to create GET request
function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/privacy')
}

// Helper to create POST request
function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/privacy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)})
}

describe('Privacy Policy API', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('GET /api/privacy', () => {
    it('should return current policy for regular users', async () => {
      // Set up owner user
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
      expect(data).toBeTruthy()
      expect(data.version).toBe('1.0')
      expect(data.status).toBe('published')
    })

    it('should return all policies for admin users', async () => {
      // Set up admin user
      mockState.setUser(USERS.ADMIN)
      mockState.setProfile({
        id: USERS.ADMIN.id,
        tenant_id: TENANTS.ADRIS,
        role: 'admin',
        full_name: 'Test Admin',
        email: USERS.ADMIN.email})

      const response = await GET(createGetRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2)
    })

    it('should require authentication', async () => {
      // No user set
      mockState.setUser(null)
      mockState.setProfile(null)

      const response = await GET(createGetRequest())

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/privacy', () => {
    it('should create a new policy draft for admin', async () => {
      // Set up admin user
      mockState.setUser(USERS.ADMIN)
      mockState.setProfile({
        id: USERS.ADMIN.id,
        tenant_id: TENANTS.ADRIS,
        role: 'admin',
        full_name: 'Test Admin',
        email: USERS.ADMIN.email})

      const response = await POST(
        createPostRequest({
          version: '3.0',
          effectiveDate: '2025-01-01',
          contentEs: '<p>Nueva política de privacidad</p>',
          changeSummary: ['Nuevo cambio'],
          requiresReacceptance: true})
      )

      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.version).toBe('3.0')
      expect(data.status).toBe('draft')
    })

    it('should reject invalid version format', async () => {
      mockState.setUser(USERS.ADMIN)
      mockState.setProfile({
        id: USERS.ADMIN.id,
        tenant_id: TENANTS.ADRIS,
        role: 'admin',
        full_name: 'Test Admin',
        email: USERS.ADMIN.email})

      const response = await POST(
        createPostRequest({
          version: 'invalid',
          effectiveDate: '2025-01-01',
          contentEs: '<p>Contenido</p>'})
      )

      expect(response.status).toBe(400)
    })

    it('should reject missing required fields', async () => {
      mockState.setUser(USERS.ADMIN)
      mockState.setProfile({
        id: USERS.ADMIN.id,
        tenant_id: TENANTS.ADRIS,
        role: 'admin',
        full_name: 'Test Admin',
        email: USERS.ADMIN.email})

      const response = await POST(
        createPostRequest({
          version: '3.0',
          // Missing effectiveDate and contentEs
        })
      )

      expect(response.status).toBe(400)
    })

    it('should reject non-admin users', async () => {
      mockState.setUser(USERS.OWNER)
      mockState.setProfile({
        id: USERS.OWNER.id,
        tenant_id: TENANTS.ADRIS,
        role: 'owner',
        full_name: 'Test Owner',
        email: USERS.OWNER.email})

      const response = await POST(
        createPostRequest({
          version: '3.0',
          effectiveDate: '2025-01-01',
          contentEs: '<p>Contenido</p>'})
      )

      expect(response.status).toBe(403)
    })
  })
})
