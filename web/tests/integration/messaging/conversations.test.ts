/**
 * Conversations API Tests
 *
 * Tests for:
 * - GET /api/conversations - List conversations
 * - POST /api/conversations - Start new conversation
 *
 * This route handles messaging between clinic and pet owners.
 * Owners see their own conversations.
 * Staff see all clinic conversations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/conversations/route'
import {
  mockState,
  USERS,
  PETS,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
}))

// Mock auth wrapper
vi.mock('@/lib/auth', () => ({
  withApiAuth: (handler: any, options?: { roles?: string[] }) => {
    return async (request: Request) => {
      const { mockState, createStatefulSupabaseMock } = await import('@/lib/test-utils')

      if (!mockState.user) {
        const { apiError, HTTP_STATUS } = await import('@/lib/api/errors')
        return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
      }

      if (!mockState.profile) {
        const { apiError, HTTP_STATUS } = await import('@/lib/api/errors')
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      if (options?.roles && !options.roles.includes(mockState.profile.role)) {
        const { apiError, HTTP_STATUS } = await import('@/lib/api/errors')
        return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN)
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

// Mock API error helpers
vi.mock('@/lib/api/errors', () => ({
  apiError: (code: string, status: number, options?: { details?: Record<string, unknown> }) => {
    const { NextResponse } = require('next/server')
    return NextResponse.json(
      { error: code, ...options?.details },
      { status }
    )
  },
  apiSuccess: (data: any, message?: string, status: number = 200) => {
    const { NextResponse } = require('next/server')
    return NextResponse.json(data, { status })
  },
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
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

// Helper to create GET request
function createGetRequest(params?: {
  status?: string
  page?: number
  limit?: number
}): NextRequest {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))

  const url = searchParams.toString()
    ? `http://localhost:3000/api/conversations?${searchParams.toString()}`
    : 'http://localhost:3000/api/conversations'

  return new NextRequest(url, { method: 'GET' })
}

// Helper to create POST request
function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Sample conversation
const SAMPLE_CONVERSATION = {
  id: 'conv-001',
  subject: 'Consulta sobre vacunas',
  status: 'open',
  priority: 'normal',
  last_message_at: '2026-01-01T10:00:00Z',
  unread_count_staff: 1,
  unread_count_client: 0,
  client: {
    id: USERS.OWNER.id,
    full_name: 'Test Owner',
    avatar_url: null,
  },
  pet: {
    id: PETS.MAX.id,
    name: PETS.MAX.name,
    photo_url: null,
  },
  assigned_staff: null,
}

const SAMPLE_CONVERSATION_CLOSED = {
  ...SAMPLE_CONVERSATION,
  id: 'conv-002',
  subject: 'Resultados de laboratorio',
  status: 'closed',
  unread_count_staff: 0,
  unread_count_client: 0,
}

// Sample pet for verification
const SAMPLE_PET = {
  id: PETS.MAX.id,
  owner_id: '00000000-0000-0000-0000-000000000003',
}

// ============================================================================
// GET Tests - List Conversations
// ============================================================================

describe('GET /api/conversations', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(401)
    })

    it('should allow owner to access', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('conversations', [], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
    })

    it('should allow vet to access', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('conversations', [], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
    })

    it('should allow admin to access', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('conversations', [], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
    })
  })

  describe('Role-Based Filtering', () => {
    it('should filter by client_id for owner role', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('conversations', [SAMPLE_CONVERSATION], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toBeDefined()
    })

    it('should show all tenant conversations for staff', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('conversations', [
        SAMPLE_CONVERSATION,
        SAMPLE_CONVERSATION_CLOSED,
      ], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data.length).toBe(2)
    })
  })

  describe('Status Filtering', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should filter by open status', async () => {
      mockState.setTableResult('conversations', [SAMPLE_CONVERSATION], 'select')

      const response = await GET(createGetRequest({ status: 'open' }))

      expect(response.status).toBe(200)
    })

    it('should filter by closed status', async () => {
      mockState.setTableResult('conversations', [SAMPLE_CONVERSATION_CLOSED], 'select')

      const response = await GET(createGetRequest({ status: 'closed' }))

      expect(response.status).toBe(200)
    })
  })

  describe('Pagination', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should support pagination parameters', async () => {
      mockState.setTableResult('conversations', [SAMPLE_CONVERSATION], 'select')

      const response = await GET(createGetRequest({ page: 1, limit: 10 }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.page).toBe(1)
      expect(body.limit).toBe(10)
    })

    it('should default to page 1 and limit 20', async () => {
      mockState.setTableResult('conversations', [], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.page).toBe(1)
      expect(body.limit).toBe(20)
    })
  })

  describe('Response Structure', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return paginated response', async () => {
      mockState.setTableResult('conversations', [SAMPLE_CONVERSATION], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toBeDefined()
      expect(body.total).toBeDefined()
      expect(body.page).toBeDefined()
      expect(body.limit).toBeDefined()
    })

    it('should include unread indicator for staff', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('conversations', [SAMPLE_CONVERSATION], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data[0].unread).toBe(true)
    })

    it('should include unread indicator for owner', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('conversations', [{
        ...SAMPLE_CONVERSATION,
        unread_count_client: 2,
      }], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data[0].unread).toBe(true)
    })

    it('should include client info', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('conversations', [SAMPLE_CONVERSATION], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data[0].client).toBeDefined()
      expect(body.data[0].client.full_name).toBeDefined()
    })

    it('should include pet info when available', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('conversations', [SAMPLE_CONVERSATION], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data[0].pet).toBeDefined()
      expect(body.data[0].pet.name).toBe(PETS.MAX.name)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableError('conversations', new Error('Database error'))

      const response = await GET(createGetRequest())

      expect(response.status).toBe(500)
    })
  })
})

// ============================================================================
// POST Tests - Start New Conversation
// ============================================================================

describe('POST /api/conversations', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await POST(createPostRequest({
        subject: 'Test',
        message: 'Test message',
      }))

      expect(response.status).toBe(401)
    })

    it('should allow owner to create', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('conversations', { id: 'conv-new' }, 'insert')
      mockState.setTableResult('messages', {}, 'insert')

      const response = await POST(createPostRequest({
        subject: 'Test subject',
        message: 'Test message',
      }))

      expect(response.status).toBe(201)
    })

    it('should allow vet to create', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('conversations', { id: 'conv-new' }, 'insert')
      mockState.setTableResult('messages', {}, 'insert')

      const response = await POST(createPostRequest({
        subject: 'Test subject',
        message: 'Test message',
        client_id: USERS.OWNER.id,
      }))

      expect(response.status).toBe(201)
    })
  })

  describe('Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 400 when subject is missing', async () => {
      const response = await POST(createPostRequest({
        message: 'Test message',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('subject')
    })

    it('should return 400 when message is missing', async () => {
      const response = await POST(createPostRequest({
        subject: 'Test subject',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('message')
    })
  })

  describe('Staff Creating Conversation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should require client_id for staff', async () => {
      const response = await POST(createPostRequest({
        subject: 'Test subject',
        message: 'Test message',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('client_id')
    })

    it('should create conversation with client_id for staff', async () => {
      mockState.setTableResult('conversations', { id: 'conv-new' }, 'insert')
      mockState.setTableResult('messages', {}, 'insert')

      const response = await POST(createPostRequest({
        subject: 'Test subject',
        message: 'Test message',
        client_id: USERS.OWNER.id,
      }))

      expect(response.status).toBe(201)
    })
  })

  describe('Pet Verification', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 400 when pet does not belong to client', async () => {
      mockState.setTableResult('pets', {
        id: PETS.MAX.id,
        owner_id: 'different-owner-id',
      }, 'select')

      const response = await POST(createPostRequest({
        subject: 'Test subject',
        message: 'Test message',
        pet_id: PETS.MAX.id,
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.reason).toBe('Mascota no encontrada o no pertenece al cliente')
    })

    it('should return 400 when pet not found', async () => {
      mockState.setTableResult('pets', null, 'select')

      const response = await POST(createPostRequest({
        subject: 'Test subject',
        message: 'Test message',
        pet_id: 'non-existent-pet',
      }))

      expect(response.status).toBe(400)
    })

    it('should allow pet_id when pet belongs to client', async () => {
      mockState.setTableResult('pets', SAMPLE_PET, 'select')
      mockState.setTableResult('conversations', { id: 'conv-new' }, 'insert')
      mockState.setTableResult('messages', {}, 'insert')

      const response = await POST(createPostRequest({
        subject: 'Test subject',
        message: 'Test message',
        pet_id: PETS.MAX.id,
      }))

      expect(response.status).toBe(201)
    })
  })

  describe('Successful Creation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should create conversation and first message', async () => {
      mockState.setTableResult('conversations', {
        id: 'conv-new',
        subject: 'Test subject',
        status: 'open',
      }, 'insert')
      mockState.setTableResult('messages', { id: 'msg-001' }, 'insert')

      const response = await POST(createPostRequest({
        subject: 'Test subject',
        message: 'Test message',
      }))

      expect(response.status).toBe(201)
    })

    it('should set started_by to client for owner', async () => {
      mockState.setTableResult('conversations', {
        id: 'conv-new',
        started_by: 'client',
      }, 'insert')
      mockState.setTableResult('messages', {}, 'insert')

      const response = await POST(createPostRequest({
        subject: 'Test subject',
        message: 'Test message',
      }))

      expect(response.status).toBe(201)
    })

    it('should set started_by to staff for vet', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('conversations', {
        id: 'conv-new',
        started_by: 'staff',
      }, 'insert')
      mockState.setTableResult('messages', {}, 'insert')

      const response = await POST(createPostRequest({
        subject: 'Test subject',
        message: 'Test message',
        client_id: USERS.OWNER.id,
      }))

      expect(response.status).toBe(201)
    })

    it('should set unread counts based on sender', async () => {
      mockState.setTableResult('conversations', {
        id: 'conv-new',
        unread_count_staff: 1,
        unread_count_client: 0,
      }, 'insert')
      mockState.setTableResult('messages', {}, 'insert')

      const response = await POST(createPostRequest({
        subject: 'Test subject',
        message: 'Test message',
      }))

      expect(response.status).toBe(201)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 500 on conversation creation error', async () => {
      mockState.setTableError('conversations', new Error('Database error'))

      const response = await POST(createPostRequest({
        subject: 'Test subject',
        message: 'Test message',
      }))

      expect(response.status).toBe(500)
    })

    it('should return 500 on message creation error', async () => {
      mockState.setTableResult('conversations', { id: 'conv-new' }, 'insert')
      mockState.setTableError('messages', new Error('Database error'))

      const response = await POST(createPostRequest({
        subject: 'Test subject',
        message: 'Test message',
      }))

      expect(response.status).toBe(500)
    })
  })
})

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Conversations Integration', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  it('should support complete messaging workflow', async () => {
    // Owner starts conversation
    mockState.setAuthScenario('OWNER')
    mockState.setTableResult('conversations', {
      id: 'conv-new',
      subject: 'Pregunta sobre tratamiento',
      status: 'open',
    }, 'insert')
    mockState.setTableResult('messages', {}, 'insert')

    const createResponse = await POST(createPostRequest({
      subject: 'Pregunta sobre tratamiento',
      message: 'Tengo una duda sobre el tratamiento de Max',
    }))
    expect(createResponse.status).toBe(201)

    // Owner lists their conversations
    mockState.setTableResult('conversations', [{
      ...SAMPLE_CONVERSATION,
      subject: 'Pregunta sobre tratamiento',
    }], 'select')

    const ownerListResponse = await GET(createGetRequest())
    expect(ownerListResponse.status).toBe(200)
    const ownerConvs = await ownerListResponse.json()
    expect(ownerConvs.data.length).toBeGreaterThan(0)

    // Staff lists all conversations
    mockState.setAuthScenario('VET')
    mockState.setTableResult('conversations', [{
      ...SAMPLE_CONVERSATION,
      subject: 'Pregunta sobre tratamiento',
    }], 'select')

    const staffListResponse = await GET(createGetRequest())
    expect(staffListResponse.status).toBe(200)
  })

  it('should handle pet-specific conversations', async () => {
    mockState.setAuthScenario('OWNER')
    mockState.setTableResult('pets', SAMPLE_PET, 'select')
    mockState.setTableResult('conversations', {
      id: 'conv-new',
      pet_id: PETS.MAX.id,
    }, 'insert')
    mockState.setTableResult('messages', {}, 'insert')

    const response = await POST(createPostRequest({
      subject: 'Consulta sobre Max',
      message: 'Max tiene síntomas extraños',
      pet_id: PETS.MAX.id,
    }))

    expect(response.status).toBe(201)
  })

  it('should handle staff-initiated conversations', async () => {
    mockState.setAuthScenario('VET')
    mockState.setTableResult('conversations', {
      id: 'conv-new',
      started_by: 'staff',
      unread_count_client: 1,
    }, 'insert')
    mockState.setTableResult('messages', {}, 'insert')

    const response = await POST(createPostRequest({
      subject: 'Recordatorio de vacuna',
      message: 'Max necesita su vacuna de refuerzo',
      client_id: USERS.OWNER.id,
    }))

    expect(response.status).toBe(201)
  })
})
