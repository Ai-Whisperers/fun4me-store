import { vi } from 'vitest'

// =============================================================================
// Types
// =============================================================================

type MockResponse<T> = { data: T | null; error: Error | null }

export interface MockUser {
  id: string
  email: string
}

export interface MockProfile {
  tenant_id: string
  role: 'owner' | 'vet' | 'admin'
  full_name: string
}

export interface TableMockConfig {
  select?: unknown
  insert?: unknown
  update?: unknown
  delete?: unknown
  error?: Error | null
}

// =============================================================================
// Default Mocks - Common patterns used across tests
// =============================================================================

export const DEFAULT_MOCK_USER: MockUser = {
  id: 'user-123',
  email: 'vet@clinic.com',
}

export const DEFAULT_MOCK_VET_PROFILE: MockProfile = {
  tenant_id: 'tenant-terrapet',
  role: 'vet',
  full_name: 'Dr. Test',
}

export const DEFAULT_MOCK_ADMIN_PROFILE: MockProfile = {
  tenant_id: 'tenant-terrapet',
  role: 'admin',
  full_name: 'Admin User',
}

export const DEFAULT_MOCK_OWNER_PROFILE: MockProfile = {
  tenant_id: 'tenant-terrapet',
  role: 'owner',
  full_name: 'Pet Owner',
}

export function createSupabaseMock<T = unknown>() {
  // Chain methods - create chainable mock
  const createChainMock = () => {
    // Using Record for test mock - allows dynamic properties while maintaining type safety
    const chain: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
      gt: vi.fn(),
      gte: vi.fn(),
      lt: vi.fn(),
      lte: vi.fn(),
      like: vi.fn(),
      ilike: vi.fn(),
      is: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      range: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }

    // Make all methods return the chain for chaining
    Object.keys(chain).forEach((key) => {
      if (key !== 'single' && key !== 'maybeSingle') {
        chain[key].mockReturnValue(chain)
      }
    })

    // Also make select return a promise with data/error for direct use
    chain.select.mockImplementation(() => {
      const result = Object.assign(Promise.resolve({ data: null, error: null }), chain)
      return result
    })

    return chain
  }

  const chainMock = createChainMock()
  const fromMock = vi.fn().mockReturnValue(chainMock)

  const supabaseMock = {
    from: fromMock,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signIn: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/file' } }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  // Helper functions
  const setQueryResult = (data: T | T[], error: Error | null = null) => {
    const singleData = Array.isArray(data) ? data[0] : data
    const arrayData = Array.isArray(data) ? data : [data]

    chainMock.single.mockResolvedValue({ data: singleData, error })
    chainMock.maybeSingle.mockResolvedValue({ data: singleData, error })

    // Update select to return promise with correct data
    chainMock.select.mockImplementation(() => {
      const result = Object.assign(Promise.resolve({ data: arrayData, error }), chainMock)
      return result
    })
  }

  const setUser = (user: { id: string; email: string } | null) => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user },
      error: null,
    })
  }

  const setError = (error: Error) => {
    chainMock.single.mockResolvedValue({ data: null, error })
    chainMock.maybeSingle.mockResolvedValue({ data: null, error })

    // Update select to return promise with error
    chainMock.select.mockImplementation(() => {
      const result = Object.assign(Promise.resolve({ data: null, error }), chainMock)
      return result
    })
  }

  return {
    supabase: supabaseMock,
    mocks: {
      from: fromMock,
      chain: chainMock,
    },
    helpers: {
      setQueryResult,
      setUser,
      setError,
      reset: () => {
        vi.clearAllMocks()
      },
    },
  }
}

// Type for the mock
export type SupabaseMock = ReturnType<typeof createSupabaseMock>

// =============================================================================
// Convenience Factory Functions
// =============================================================================

/**
 * Creates a mock Supabase client with a pre-configured authenticated user
 */
export function createAuthenticatedMock(
  user: MockUser = DEFAULT_MOCK_USER,
  profile: MockProfile = DEFAULT_MOCK_VET_PROFILE
) {
  const mock = createSupabaseMock()
  mock.helpers.setUser(user)

  // Configure profiles table to return the profile
  mock.supabase.from = vi.fn().mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: profile, error: null }),
      }
    }
    return mock.mocks.chain
  })

  return { ...mock, user, profile }
}

/**
 * Creates a mock Supabase client configured for RPC calls
 */
export function createRpcMock<TResult = unknown>(
  result: TResult,
  error: Error | null = null
) {
  const mock = createSupabaseMock()
  mock.supabase.rpc.mockResolvedValue({ data: result, error })
  return mock
}

/**
 * Creates a mock Supabase client with table-specific configurations
 */
export function createTableMock(
  tableConfigs: Record<string, TableMockConfig>
) {
  const mock = createSupabaseMock()

  mock.supabase.from = vi.fn().mockImplementation((table: string) => {
    const config = tableConfigs[table]

    if (!config) {
      return mock.mocks.chain
    }

    const tableChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: config.select,
        error: config.error || null,
      }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: config.select,
        error: config.error || null,
      }),
    }

    // Make methods return the chain
    Object.entries(tableChain).forEach(([key, fn]) => {
      if (key !== 'single' && key !== 'maybeSingle') {
        (fn as ReturnType<typeof vi.fn>).mockReturnValue(tableChain)
      }
    })

    return tableChain
  })

  return mock
}

// =============================================================================
// Mock Module Helpers
// =============================================================================

/**
 * Common vi.mock configuration for @/lib/supabase/server
 * Usage: vi.mock('@/lib/supabase/server', () => getSupabaseServerMock(mockSupabase))
 */
export function getSupabaseServerMock(supabaseMock: SupabaseMock) {
  return {
    createClient: vi.fn().mockResolvedValue(supabaseMock.supabase),
  }
}

/**
 * Common vi.mock configuration for @/lib/auth with API handler wrapper
 * Usage: vi.mock('@/lib/auth', () => getAuthMock(user, profile, supabase))
 */
export function getAuthHandlerMock(
  user: MockUser = DEFAULT_MOCK_USER,
  profile: MockProfile = DEFAULT_MOCK_VET_PROFILE,
  supabase?: SupabaseMock['supabase']
) {
  return {
    withApiAuthParams: (
      handler: (
        ctx: { user: MockUser; profile: MockProfile; supabase: ReturnType<typeof createSupabaseMock>['supabase']; request: Request },
        params: Record<string, string>
      ) => Promise<Response>,
      _options?: { roles: string[] }
    ) => {
      return async (
        request: Request,
        context: { params: Promise<Record<string, string>> }
      ) => {
        const params = await context.params
        return handler(
          {
            user,
            profile,
            supabase: supabase || createSupabaseMock().supabase,
            request,
          },
          params
        )
      }
    },
    isStaff: (p: { role: string }) => ['vet', 'admin'].includes(p.role),
    isOwner: (p: { role: string }) => p.role === 'owner',
  }
}

/**
 * Common vi.mock configuration for @/lib/audit
 */
export function getAuditMock() {
  return {
    logAudit: vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * Common vi.mock configuration for @/lib/rate-limit
 */
export function getRateLimitMock(success = true) {
  return {
    rateLimit: vi.fn().mockResolvedValue({ success }),
  }
}
