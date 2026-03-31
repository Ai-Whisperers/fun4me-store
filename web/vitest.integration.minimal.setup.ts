/**
 * Minimal Setup for Integration Tests
 * 
 * This provides ONLY the essential Next.js mocks needed to prevent
 * "cookies was called outside request scope" errors while preserving
 * database isolation for true integration testing.
 */

import { vi } from 'vitest'

/**
 * Mock Next.js cookies() to prevent "outside request scope" errors
 * Used by: lib/supabase/server.ts, lib/auth/fast-auth.ts, lib/security/csrf.ts
 */
vi.mock('next/headers', async () => {
  const actual = await vi.importActual('next/headers')
  
  // Create a minimal ReadonlyRequestCookies-compatible mock
  const mockCookies = {
    get: vi.fn(() => undefined),
    getAll: vi.fn(() => []),
    has: vi.fn(() => false),
    set: vi.fn(),
    delete: vi.fn(),
    toString: vi.fn(() => ''),
    [Symbol.iterator]: vi.fn(() => [][Symbol.iterator]()),
    size: 0,
    forEach: vi.fn(),
    entries: vi.fn(() => [][Symbol.iterator]()),
    keys: vi.fn(() => [][Symbol.iterator]()),
    values: vi.fn(() => [][Symbol.iterator]()),
  }
  
  return {
    ...actual,
    cookies: vi.fn().mockResolvedValue(mockCookies),
    headers: vi.fn().mockResolvedValue(new Map()),
  }
})

/**
 * Mock Supabase server to prevent cookies() calls in auth initialization
 * This allows integration tests to use real database but avoids Next.js context issues
 */
vi.mock('@/lib/supabase/server', async () => {
  const { createClient } = await import('@supabase/supabase-js')
  
  return {
    createClient: () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for integration tests
      {
        auth: { persistSession: false }
      }
    )
  }
})

console.log('[Integration Tests] Minimal Next.js mocks loaded (cookies() + headers())')