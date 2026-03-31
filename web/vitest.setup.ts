import { vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom'

// =============================================================================
// Next.js Headers Mock (MUST BE FIRST)
// =============================================================================
// Mock next/headers to avoid "cookies was called outside a request scope" errors
// This mock provides working cookies() and headers() functions for API route tests

const mockCookieStore = new Map<string, string>()
// Default auth cookie for authenticated tests
mockCookieStore.set('sb-auth-token', 'mock-auth-token')

vi.mock('next/headers', () => {
  // Create the cookie store object that will be returned
  const createCookieStore = () => ({
    get: vi.fn((name: string) => {
      const value = mockCookieStore.get(name) || mockCookieStore.get('sb-auth-token')
      return value ? { name, value } : undefined
    }),
    getAll: vi.fn(() => 
      Array.from(mockCookieStore.entries()).map(([name, value]) => ({ name, value }))
    ),
    set: vi.fn((name: string, value: string) => mockCookieStore.set(name, value)),
    delete: vi.fn((name: string) => mockCookieStore.delete(name)),
    has: vi.fn((name: string) => mockCookieStore.has(name)),
  })

  return {
    // Next.js 15 cookies() returns a Promise
    cookies: vi.fn(() => Promise.resolve(createCookieStore())),
    // headers() also returns a Promise in Next.js 15
    headers: vi.fn(() => Promise.resolve(new Headers({
      'content-type': 'application/json',
      'x-tenant-id': 'test-tenant',
    }))),
  }
})

// =============================================================================
// QA Infrastructure Integration
// =============================================================================

import { resetIdCounter } from '@/lib/test-utils/factories'
import { resetMockState } from '@/lib/test-utils/mock-presets'

/**
 * Global beforeEach hook
 * - Resets mock state (auth scenarios, table results)
 * - Resets ID counter for predictable test IDs
 */
beforeEach(() => {
  resetMockState()
  resetIdCounter()
})

/**
 * Global afterEach hook
 * - Clears all mocks
 */
afterEach(() => {
  vi.clearAllMocks()
})

// =============================================================================
// Supabase Server Client Mock for API Integration Tests
// =============================================================================

/**
 * CRITICAL FIX: Mock lib/supabase/server.ts to avoid Next.js cookies() call
 * 
 * Problem: lib/supabase/server uses cookies() which only works in Next.js request context.
 * In Vitest, calling cookies() throws: "cookies was called outside a request scope"
 * 
 * Solution: Replace cookies-based auth with stub that returns unauthenticated client.
 * The actual auth happens in withApiAuth wrapper which reads Bearer token from headers.
 * 
 * Flow in tests:
 * 1. Test creates NextRequest with Authorization: Bearer <token>
 * 2. withApiAuth reads Bearer token from request.headers
 * 3. withApiAuth calls AuthService.validateAuth() 
 * 4. validateAuth calls createClient() to get Supabase client (this mock)
 * 5. validateAuth uses client.auth.getUser() to verify the session
 * 6. PROBLEM: client.auth.getUser() checks cookies, not Bearer token!
 * 
 * The real fix is in AuthService - it needs to accept Bearer token OR cookies.
 */

// Mock lib/supabase/server.ts to return an unauthenticated client
// Auth will be handled by the API wrapper reading Bearer tokens
vi.mock('@/lib/supabase/server', async () => {
  const { createClient: originalCreateClient } = await import('@supabase/supabase-js')
  
  return {
    createClient: async (keyType: 'anon' | 'service_role' = 'anon') => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!url) throw new Error('[Vitest] NEXT_PUBLIC_SUPABASE_URL not set')
      
      const apiKey = keyType === 'service_role' ? serviceKey : anonKey
      if (!apiKey) throw new Error(`[Vitest] Supabase ${keyType} key not set`)
      
      // Return basic Supabase client without cookies
      // NOTE: This client won't have auth session from cookies
      // Auth must be handled via Bearer tokens in request headers
      return originalCreateClient(url, apiKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    },
  }
})

// =============================================================================
// Legacy Supabase Mock (commented out, kept for reference)
// =============================================================================

// DISABLED: Direct @supabase/supabase-js mocking not needed now that we mock
// lib/supabase/server.ts to handle Bearer token auth properly.

/*
vi.mock('@supabase/supabase-js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@supabase/supabase-js')>()
  return {
    ...actual,
    createClient: () => ({
      from: () => ({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockResolvedValue({ data: [], error: null }),
        delete: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    }),
  }
})
*/
