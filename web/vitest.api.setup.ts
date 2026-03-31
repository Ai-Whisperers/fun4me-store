import { vi } from 'vitest'

// =============================================================================
// Next.js Headers Mock — Required for API route tests
// =============================================================================
// API routes call cookies() internally via lib/supabase/server createClient.
// In test environment, there's no Next.js request scope, so we mock this.

vi.mock('next/headers', () => {
  const mockCookieStore = new Map<string, string>()
  
  const createCookieStore = () => ({
    get: vi.fn((name: string) => {
      const value = mockCookieStore.get(name)
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
    cookies: vi.fn(() => Promise.resolve(createCookieStore())),
    headers: vi.fn(() =>
      Promise.resolve(
        new Headers({
          'content-type': 'application/json',
        })
      )
    ),
  }
})

// =============================================================================
// Supabase Server Client Mock
// =============================================================================
// Mock lib/supabase/server to avoid cookies() call in production code path.
// API tests use Bearer token auth (Authorization header), not cookies.
// The real auth flow: withApiAuth reads Bearer token → AuthService.validateAuth 
// detects Bearer prefix → creates direct Supabase client with token (bypasses cookies).
// But when NO token is provided (testing unauthenticated), it falls to cookies path → crash.
// This mock ensures the cookies path returns an unauthenticated client instead of crashing.

vi.mock('@/lib/supabase/server', async () => {
  const { createClient: originalCreateClient } = await import('@supabase/supabase-js')

  return {
    createClient: async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!url || !anonKey) {
        throw new Error('[Vitest API Setup] Supabase env vars not set')
      }

      // Return unauthenticated client — auth is handled via Bearer tokens in headers
      return originalCreateClient(url, anonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    },
  }
})