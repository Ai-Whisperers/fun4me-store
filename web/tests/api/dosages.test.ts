import { GET } from '@/app/api/drug_dosages/route'
import { vi, expect, test } from 'vitest'
import { NextRequest } from 'next/server'

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

// Mock Supabase server client to avoid cookies() call
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: () => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockResolvedValue({ data: [], error: null }),
      delete: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}))

test('GET /api/drug_dosages returns data', async () => {
  // Mock request
  const req = new NextRequest('http://localhost/api/drug_dosages')
  const res = await GET(req)
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(Array.isArray(json)).toBe(true)
})
