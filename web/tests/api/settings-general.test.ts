import { PUT } from '@/app/api/settings/general/route'
import { vi, expect, describe, it, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { TENANT_IDS } from '@/lib/constants/tenants';

// Mock Next.js server modules
vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: (body: any, init?: any) => ({
        status: init?.status || 200,
        json: async () => body,
      }),
    },
    NextRequest: class extends Request {},
  }
})

// Mock withAuth to just call the handler with a mock context
vi.mock('@/lib/api/with-auth', () => ({
  withAuth: (handler: any) => async (request: any) => {
    return handler({
      request,
      user: { id: 'user-123' },
      profile: { role: 'admin', tenant_id: TENANT_IDS.ADRIS },
      supabase: {},
    })
  },
}))

// Mock apiError and validationError
vi.mock('@/lib/api/errors', () => ({
  apiError: (type: string, status: number) => ({
    status,
    json: async () => ({ error: type }),
  }),
  apiSuccess: (data: any) => ({
    status: 200,
    json: async () => ({ success: true, data }),
  }),
  validationError: (fieldErrors: any) => ({
    status: 400,
    json: async () => ({ error: 'VALIDATION_ERROR', field_errors: fieldErrors }),
  }),
}))

// Mock fs and path
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('{}'),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('path', () => ({
  join: (...args: string[]) => args.join('/'),
}))

describe('PUT /api/settings/general', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when name is missing (validation error)', async () => {
    const req = new Request('http://localhost/api/settings/general', {
      method: 'PUT',
      body: JSON.stringify({ clinic: 'terrapet' }), // missing 'name'
    }) as unknown as NextRequest

    const res = await PUT(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('VALIDATION_ERROR')
    expect(json.field_errors).toHaveProperty('name')
  })

  it('should return 200 and success when data is valid', async () => {
    const req = new Request('http://localhost/api/settings/general', {
      method: 'PUT',
      body: JSON.stringify({
        clinic: 'terrapet',
        name: 'New Clinic Name',
      }),
    }) as unknown as NextRequest

    const res = await PUT(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})
