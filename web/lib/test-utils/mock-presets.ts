/**
 * Mock Presets - Stateful mock configuration for tests
 *
 * Eliminates the need for inline mock definitions. Tests configure
 * state, and the mock system reads from it automatically.
 *
 * @example
 * ```typescript
 * import { mockState, createStatefulSupabaseMock } from '@/lib/test-utils';
 *
 * vi.mock('@/lib/supabase/server', () => ({
 *   createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
 * }));
 *
 * beforeEach(() => {
 *   mockState.reset();
 *   mockState.setAuthScenario('VET');
 * });
 *
 * it('should process invoice', async () => {
 *   mockState.setTableResult('invoices', [mockInvoice]);
 *   // ... test
 * });
 * ```
 */

import { vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import type { ApiHandlerContext, ApiHandlerContextWithParams } from '@/lib/auth'
import { TENANT_IDS } from '@/lib/constants/tenants';

// =============================================================================
// Types
// =============================================================================

export interface MockUser {
  id: string
  email: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
  aud?: string
  created_at?: string
}

export interface MockProfile {
  id: string
  tenant_id: string
  role: 'owner' | 'vet' | 'admin'
  full_name?: string
  email?: string
  phone?: string
}

// =============================================================================
// Default Mock Data
// =============================================================================

export const DEFAULT_MOCK_USER: MockUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@clinic.com',
  aud: 'authenticated',
  created_at: new Date().toISOString(),
}

export const DEFAULT_MOCK_VET_PROFILE: MockProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  tenant_id: TENANT_IDS.ADRIS,
  role: 'vet',
  full_name: 'Dr. Test Vet',
  email: 'vet@clinic.com',
}

export const DEFAULT_MOCK_ADMIN_PROFILE: MockProfile = {
  id: '00000000-0000-0000-0000-000000000002',
  tenant_id: TENANT_IDS.ADRIS,
  role: 'admin',
  full_name: 'Admin User',
  email: 'admin@clinic.com',
}

export const DEFAULT_MOCK_OWNER_PROFILE: MockProfile = {
  id: '00000000-0000-0000-0000-000000000003',
  tenant_id: TENANT_IDS.ADRIS,
  role: 'owner',
  full_name: 'Pet Owner',
  email: 'owner@gmail.com',
  phone: '+595981123456',
}

// =============================================================================
// Auth Scenarios
// =============================================================================

export const AUTH_SCENARIOS = {
  UNAUTHENTICATED: {
    user: null,
    profile: null,
  },
  VET: {
    user: DEFAULT_MOCK_USER,
    profile: DEFAULT_MOCK_VET_PROFILE,
  },
  ADMIN: {
    user: { ...DEFAULT_MOCK_USER, id: '00000000-0000-0000-0000-000000000002', email: 'admin@clinic.com' },
    profile: DEFAULT_MOCK_ADMIN_PROFILE,
  },
  OWNER: {
    user: { ...DEFAULT_MOCK_USER, id: '00000000-0000-0000-0000-000000000003', email: 'owner@gmail.com' },
    profile: DEFAULT_MOCK_OWNER_PROFILE,
  },
} as const

export type AuthScenario = keyof typeof AUTH_SCENARIOS

// =============================================================================
// Mock State Singleton
// =============================================================================

class MockState {
  private _user: MockUser | null = null
  private _profile: MockProfile | null = null
  private _tableResults: Map<string, unknown> = new Map()
  private _rpcResults: Map<string, unknown> = new Map()
  private _errors: Map<string, Error> = new Map()

  /**
   * Set authentication scenario (UNAUTHENTICATED, VET, ADMIN, OWNER)
   */
  setAuthScenario(scenario: AuthScenario): void {
    const config = AUTH_SCENARIOS[scenario]
    this._user = config.user ? { ...config.user } : null
    this._profile = config.profile ? { ...config.profile } : null
  }

  /**
   * Set custom user
   */
  setUser(user: MockUser | null): void {
    this._user = user
  }

  /**
   * Set custom profile
   */
  setProfile(profile: MockProfile | null): void {
    this._profile = profile
  }

  /**
   * Set result for a table query
   * @param table - The table name
   * @param result - The result to return
   * @param _operation - Optional operation type (select, insert, update, delete) - kept for backward compatibility
   */
  setTableResult(table: string, result: unknown, _operation?: 'select' | 'insert' | 'update' | 'delete'): void {
    this._tableResults.set(table, result)
    this._errors.delete(table)
  }

  /**
   * Set result for an RPC call
   */
  setRpcResult(functionName: string, result: unknown): void {
    this._rpcResults.set(functionName, result)
  }

  /**
   * Set error for an RPC call
   * @param functionName - The RPC function name
   * @param error - The error to throw
   */
  setRpcError(functionName: string, error: Error): void {
    this._errors.set(`rpc:${functionName}`, error)
  }

  /**
   * Get RPC error
   */
  getRpcError(functionName: string): Error | undefined {
    return this._errors.get(`rpc:${functionName}`)
  }

  /**
   * Check if RPC has error configured
   */
  hasRpcError(functionName: string): boolean {
    return this._errors.has(`rpc:${functionName}`)
  }

  /**
   * Set error for storage operations
   * @param bucket - The storage bucket name (or 'default' for any bucket)
   * @param error - The error to throw
   */
  setStorageError(bucket: string, error: Error): void {
    this._errors.set(`storage:${bucket}`, error)
  }

  /**
   * Get storage error
   */
  getStorageError(bucket: string): Error | undefined {
    return this._errors.get(`storage:${bucket}`) || this._errors.get('storage:default')
  }

  /**
   * Check if storage has error configured
   */
  hasStorageError(bucket: string): boolean {
    return this._errors.has(`storage:${bucket}`) || this._errors.has('storage:default')
  }

  /**
   * Set error for a table query
   * @param table - The table name
   * @param error - Can be an Error object or a Postgrest-style error with code/message
   */
  setTableError(table: string, error: Error | { code?: string; message: string }): void {
    // Convert Postgrest-style errors to Error objects
    const errorObj = error instanceof Error ? error : Object.assign(new Error(error.message), { code: error.code })
    this._errors.set(table, errorObj)
    this._tableResults.delete(table)
  }

  /**
   * Get current user
   */
  get user(): MockUser | null {
    return this._user
  }

  /**
   * Get current profile
   */
  get profile(): MockProfile | null {
    return this._profile
  }

  /**
   * Get table result
   */
  getTableResult(table: string): unknown {
    return this._tableResults.get(table)
  }

  /**
   * Get RPC result
   */
  getRpcResult(functionName: string): unknown {
    return this._rpcResults.get(functionName)
  }

  /**
   * Get table error
   */
  getTableError(table: string): Error | undefined {
    return this._errors.get(table)
  }

  /**
   * Check if table has error configured
   */
  hasTableError(table: string): boolean {
    return this._errors.has(table)
  }

  /**
   * Set rejection for a table query - causes Promise to reject instead of returning error object.
   * Use this to test try/catch error handling paths (triggers actual exceptions).
   * @param table - The table name
   * @param error - The error to throw (will reject the Promise)
   */
  setTableRejection(table: string, error: Error): void {
    this._errors.set(`reject:${table}`, error)
    this._tableResults.delete(table)
  }

  /**
   * Check if table has rejection configured
   */
  hasTableRejection(table: string): boolean {
    return this._errors.has(`reject:${table}`)
  }

  /**
   * Get table rejection error
   */
  getTableRejection(table: string): Error | undefined {
    return this._errors.get(`reject:${table}`)
  }

  /**
   * Reset all state
   */
  reset(): void {
    this._user = null
    this._profile = null
    this._tableResults.clear()
    this._rpcResults.clear()
    this._errors.clear()
  }

  /**
   * Quick setup for common test patterns
   */
  setupForApiTest(scenario: AuthScenario = 'VET'): void {
    this.reset()
    this.setAuthScenario(scenario)
  }
}

// Singleton instance
export const mockState = new MockState()

// =============================================================================
// Stateful Supabase Mock Factory
// =============================================================================

/**
 * Create a Supabase mock that reads from mockState
 */
export function createStatefulSupabaseMock() {
  return {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: mockState.user },
          error: mockState.user ? null : { message: 'Not authenticated' },
        })
      ),
      getSession: vi.fn(() =>
        Promise.resolve({
          data: { session: mockState.user ? { user: mockState.user } : null },
          error: null,
        })
      ),
      signInWithPassword: vi.fn(() =>
        Promise.resolve({
          data: { user: mockState.user, session: mockState.user ? { access_token: 'mock-token' } : null },
          error: mockState.user ? null : { message: 'Invalid credentials' },
        })
      ),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    from: vi.fn((table: string) => {
      // Special handling for profiles table
      if (table === 'profiles' && mockState.profile) {
        return createChainMock(mockState.profile)
      }

      // Check for configured rejection (throws/rejects instead of returning error object)
      // Non-null assertions safe: has* methods check existence before get* methods
      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      if (mockState.hasTableRejection(table)) {
        return createRejectionChainMock(mockState.getTableRejection(table)!)
      }

      // Check for configured error (returns Supabase-style {data: null, error})
      if (mockState.hasTableError(table)) {
        return createErrorChainMock(mockState.getTableError(table)!)
      }
      /* eslint-enable @typescript-eslint/no-non-null-assertion */

      // Return configured result or null
      const result = mockState.getTableResult(table)
      return createChainMock(result)
    }),
    rpc: vi.fn((fn: string, _params?: unknown) => {
      if (mockState.hasRpcError(fn)) {
        // Non-null assertion safe: hasRpcError checks existence
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        return Promise.resolve({
          data: null,
          error: { message: mockState.getRpcError(fn)!.message },
        })
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
      }
      return Promise.resolve({
        data: mockState.getRpcResult(fn),
        error: null,
      })
    }),
    storage: createStorageMock(),
  }
}

/**
 * Create chainable query mock
 */
function createChainMock(defaultResult: unknown) {
  const resolvedValue = {
    data: Array.isArray(defaultResult) ? defaultResult : defaultResult ? [defaultResult] : [],
    error: null,
    count: null,
  }

  const singleValue = {
    data: Array.isArray(defaultResult) ? defaultResult[0] : defaultResult,
    error: null,
  }

  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(singleValue),
    maybeSingle: vi.fn().mockResolvedValue(singleValue),
  }

  // Make select also resolve to array result
  const originalSelect = chain.select
  chain.select = vi.fn().mockImplementation(() => {
    const result = Object.assign(Promise.resolve(resolvedValue), chain)
    return result
  })

  // Make insert/update/delete return count
  ;['insert', 'update', 'delete'].forEach((method) => {
    const original = chain[method]
    chain[method] = vi.fn().mockImplementation(() => {
      const result = Object.assign(Promise.resolve({ data: singleValue.data, error: null, count: 1 }), chain)
      return result
    })
  })

  return chain
}

/**
 * Create error chain mock - returns error for all operations
 */
function createErrorChainMock(error: Error & { code?: string }) {
  const errorValue = { data: null, error: { message: error.message, code: error.code } }

  // Build chain with all methods returning either this or error
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  // All chainable methods that return this
  const chainableMethods = [
    'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'is', 'in', 'not', 'or', 'filter',
    'order', 'limit', 'range', 'upsert',
  ]

  chainableMethods.forEach((method) => {
    chain[method] = vi.fn().mockReturnThis()
  })

  // Methods that resolve with error
  chain.single = vi.fn().mockResolvedValue(errorValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(errorValue)

  // insert/update/delete/upsert also resolve with error
  ;['insert', 'update', 'delete', 'upsert'].forEach((method) => {
    chain[method] = vi.fn().mockImplementation(() => {
      // Return a promise with error that also has chainable methods
      const result = Object.assign(Promise.resolve(errorValue), chain)
      return result
    })
  })

  // Make select also return a promise with error
  chain.select = vi.fn().mockImplementation(() => {
    const result = Object.assign(Promise.resolve(errorValue), chain)
    return result
  })

  return chain
}

/**
 * Create rejection chain mock - rejects promises instead of returning error objects.
 * Use this to test try/catch error handling paths.
 */
function createRejectionChainMock(error: Error) {
  // Build chain with all methods returning either this or rejecting
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  // All chainable methods that return this
  const chainableMethods = [
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'is', 'in', 'not', 'or', 'filter',
    'order', 'limit', 'range',
  ]

  chainableMethods.forEach((method) => {
    chain[method] = vi.fn().mockReturnThis()
  })

  // Methods that reject (throw)
  chain.single = vi.fn().mockRejectedValue(error)
  chain.maybeSingle = vi.fn().mockRejectedValue(error)

  // select also rejects
  chain.select = vi.fn().mockImplementation(() => {
    const result = Object.assign(Promise.reject(error), chain)
    return result
  })

  // insert/update/delete/upsert also reject
  ;['insert', 'update', 'delete', 'upsert'].forEach((method) => {
    chain[method] = vi.fn().mockImplementation(() => {
      const result = Object.assign(Promise.reject(error), chain)
      return result
    })
  })

  return chain
}

/**
 * Create storage mock
 */
function createStorageMock() {
  return {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test/path.jpg' }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/storage/test.jpg' } }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get Supabase server mock for vi.mock
 */
export function getSupabaseServerMock() {
  return {
    createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
  }
}

/**
 * Reset mock state (for beforeEach)
 */
export function resetMockState(): void {
  mockState.reset()
}

/**
 * Setup mock state for common API test pattern
 */
export function setupApiTestMocks(scenario: AuthScenario = 'VET'): void {
  mockState.setupForApiTest(scenario)
}

// =============================================================================
// Auth Module Mock
// =============================================================================

/**
 * Type for the mock Supabase client returned by createStatefulSupabaseMock
 */
export type MockSupabaseClient = ReturnType<typeof createStatefulSupabaseMock>

/**
 * Context passed to API handlers in mocks
 */
export interface MockApiHandlerContext {
  user: MockUser
  profile: MockProfile
  supabase: MockSupabaseClient
  request: NextRequest
}

/**
 * Context for handlers with route params
 */
export interface MockApiHandlerContextWithParams<P = Record<string, string>> extends MockApiHandlerContext {
  params: P
}

/**
 * Create a mock logger that matches the RequestLogger interface
 */
export function createMockLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }
}

/**
 * Create a mock performance tracker that matches the PerformanceTracker interface
 */
export function createMockPerfTracker() {
  return {
    checkpoint: vi.fn(),
    finish: vi.fn().mockReturnValue(0),
    getDuration: vi.fn().mockReturnValue(0),
  }
}

/**
 * Create a mock scoped queries object
 */
export function createMockScopedQueries(supabase: ReturnType<typeof createStatefulSupabaseMock>, tenantId: string) {
  return {
    pets: () => supabase.from('pets'),
    appointments: () => supabase.from('appointments'),
    invoices: () => supabase.from('invoices'),
    services: () => supabase.from('services'),
    profiles: () => supabase.from('profiles'),
    // Add other scoped queries as needed
  }
}

/**
 * Get auth module mock for vi.mock('@/lib/auth', ...)
 *
 * This mocks both withApiAuth and withApiAuthParams wrappers to use mockState
 * instead of the real auth system (which requires DATABASE_URL).
 *
 * The mock accepts both Request and NextRequest for backward compatibility.
 * At runtime, NextRequest extends Request so both work correctly.
 *
 * Context properties provided:
 * - user: Current authenticated user
 * - profile: User's profile with tenant_id and role
 * - supabase: Stateful Supabase mock
 * - request: The incoming request
 * - log: Mock logger with info/error/warn/debug
 * - perf: Mock performance tracker
 * - requestId: Unique request ID
 * - scoped: Mock scoped queries
 *
 * @example
 * ```typescript
 * vi.mock('@/lib/auth', () => getAuthMock())
 * ```
 */
export function getAuthMock() {
  return {
    /**
     * Mock for withApiAuth - wraps handlers without route params
     * Accepts Request or NextRequest for test compatibility
     */
    withApiAuth: (
      handler: (ctx: ApiHandlerContext) => Promise<NextResponse>,
      _options?: { roles?: string[] }
    ) => {
      // Return function that accepts Request (base type that NextRequest extends)
      return async (request: Request): Promise<NextResponse> => {
        // Check auth scenario
        if (!mockState.user) {
          return NextResponse.json(
            { error: 'No autorizado', code: 'AUTH_REQUIRED' },
            { status: 401 }
          )
        }

        if (!mockState.profile) {
          return NextResponse.json(
            { error: 'Acceso denegado', code: 'FORBIDDEN' },
            { status: 403 }
          )
        }

        // Check role if options provided
        if (_options?.roles && !_options.roles.includes(mockState.profile.role)) {
          return NextResponse.json(
            { error: 'Acceso denegado', code: 'INSUFFICIENT_ROLE' },
            { status: 403 }
          )
        }

        const supabase = createStatefulSupabaseMock()
        const requestId = crypto.randomUUID()

        return handler({
          user: mockState.user as unknown as User,
          profile: mockState.profile as unknown as ApiHandlerContext['profile'],
          supabase: supabase as unknown as ApiHandlerContext['supabase'],
          request: request as NextRequest,
          log: createMockLogger() as unknown as ApiHandlerContext['log'],
          perf: createMockPerfTracker() as unknown as ApiHandlerContext['perf'],
          requestId,
          scoped: createMockScopedQueries(supabase, mockState.profile.tenant_id) as unknown as ApiHandlerContext['scoped'],
          isAuthenticated: true,
        })
      }
    },

    /**
     * Mock for withApiAuthParams - wraps handlers with route params
     * Accepts Request or NextRequest for test compatibility
     */
    withApiAuthParams: <P extends Record<string, string> = Record<string, string>>(
      handler: (ctx: ApiHandlerContextWithParams<P>) => Promise<NextResponse>,
      _options?: { roles?: string[] }
    ) => {
      return async (
        request: Request,
        context: { params: Promise<P> }
      ): Promise<NextResponse> => {
        // Check auth scenario
        if (!mockState.user) {
          return NextResponse.json(
            { error: 'No autorizado', code: 'AUTH_REQUIRED' },
            { status: 401 }
          )
        }

        if (!mockState.profile) {
          return NextResponse.json(
            { error: 'Acceso denegado', code: 'FORBIDDEN' },
            { status: 403 }
          )
        }

        // Check role if options provided
        if (_options?.roles && !_options.roles.includes(mockState.profile.role)) {
          return NextResponse.json(
            { error: 'Acceso denegado', code: 'INSUFFICIENT_ROLE' },
            { status: 403 }
          )
        }

        const params = await context.params
        const supabase = createStatefulSupabaseMock()
        const requestId = crypto.randomUUID()

        return handler({
          user: mockState.user as unknown as User,
          profile: mockState.profile as unknown as ApiHandlerContext['profile'],
          supabase: supabase as unknown as ApiHandlerContext['supabase'],
          request: request as NextRequest,
          params,
          log: createMockLogger() as unknown as ApiHandlerContext['log'],
          perf: createMockPerfTracker() as unknown as ApiHandlerContext['perf'],
          requestId,
          scoped: createMockScopedQueries(supabase, mockState.profile.tenant_id) as unknown as ApiHandlerContext['scoped'],
          isAuthenticated: true,
        })
      }
    },

    isStaff: (profile: { role: string }) => ['vet', 'admin'].includes(profile.role),
    isAdmin: (profile: { role: string }) => profile.role === 'admin',
    isOwner: (profile: { role: string }) => profile.role === 'owner',
  }
}

/**
 * Get features mock for vi.mock('@/lib/features/server', ...)
 *
 * This mocks the requireFeature function used for feature gating.
 * By default, all features are allowed (returns null).
 *
 * @example
 * ```typescript
 * vi.mock('@/lib/features/server', () => getFeaturesMock())
 *
 * // To deny a feature in a specific test:
 * vi.mocked(requireFeature).mockResolvedValueOnce(NextResponse.json({ error: 'Feature disabled' }, { status: 403 }))
 * ```
 */
export function getFeaturesMock() {
  return {
    requireFeature: vi.fn().mockResolvedValue(null), // null = feature allowed
    checkFeature: vi.fn().mockResolvedValue(true), // true = feature enabled
  }
}

// =============================================================================
// Service Mocks
// =============================================================================

/**
 * Mock Email Service State
 */
class EmailServiceMock {
  private _sentEmails: Array<{
    to: string
    subject: string
    body: string
    attachments?: Array<{ filename: string; content: Buffer | string }>
    sentAt: Date
  }> = []
  private _shouldFail: boolean = false
  private _failureMessage: string = 'Email service unavailable'

  /**
   * Record an email send
   */
  send(to: string, subject: string, body: string, attachments?: Array<{ filename: string; content: Buffer | string }>): Promise<{ id: string }> {
    if (this._shouldFail) {
      return Promise.reject(new Error(this._failureMessage))
    }

    const email = { to, subject, body, attachments, sentAt: new Date() }
    this._sentEmails.push(email)
    return Promise.resolve({ id: `email-${Date.now()}` })
  }

  /**
   * Get all sent emails
   */
  get sentEmails() {
    return [...this._sentEmails]
  }

  /**
   * Get emails sent to a specific address
   */
  getEmailsTo(address: string) {
    return this._sentEmails.filter(e => e.to === address)
  }

  /**
   * Configure to fail on next send
   */
  setFailure(shouldFail: boolean, message?: string): void {
    this._shouldFail = shouldFail
    if (message) this._failureMessage = message
  }

  /**
   * Reset state
   */
  reset(): void {
    this._sentEmails = []
    this._shouldFail = false
    this._failureMessage = 'Email service unavailable'
  }
}

export const mockEmailService = new EmailServiceMock()

/**
 * Get Resend/Email mock for vi.mock
 */
export function getEmailMock() {
  return {
    Resend: vi.fn(() => ({
      emails: {
        send: vi.fn(async (params: { to: string; subject: string; html: string; attachments?: unknown[] }) => {
          return mockEmailService.send(
            Array.isArray(params.to) ? params.to[0] : params.to,
            params.subject,
            params.html,
            params.attachments as Array<{ filename: string; content: Buffer | string }>
          )
        }),
      },
    })),
  }
}

/**
 * Mock SMS Service State
 */
class SmsServiceMock {
  private _sentMessages: Array<{
    to: string
    message: string
    sentAt: Date
  }> = []
  private _shouldFail: boolean = false

  send(to: string, message: string): Promise<{ id: string }> {
    if (this._shouldFail) {
      return Promise.reject(new Error('SMS service unavailable'))
    }

    this._sentMessages.push({ to, message, sentAt: new Date() })
    return Promise.resolve({ id: `sms-${Date.now()}` })
  }

  get sentMessages() {
    return [...this._sentMessages]
  }

  getMessagesTo(phone: string) {
    return this._sentMessages.filter(m => m.to === phone)
  }

  setFailure(shouldFail: boolean): void {
    this._shouldFail = shouldFail
  }

  reset(): void {
    this._sentMessages = []
    this._shouldFail = false
  }
}

export const mockSmsService = new SmsServiceMock()

/**
 * Get SMS mock for vi.mock
 */
export function getSmsMock() {
  return {
    sendSms: vi.fn(async (to: string, message: string) => mockSmsService.send(to, message)),
  }
}

/**
 * Mock WhatsApp Service State
 */
class WhatsAppServiceMock {
  private _sentMessages: Array<{
    to: string
    template?: string
    message?: string
    mediaUrl?: string
    sentAt: Date
    status: 'sent' | 'delivered' | 'read' | 'failed'
  }> = []
  private _shouldFail: boolean = false

  send(params: { to: string; template?: string; message?: string; mediaUrl?: string }): Promise<{ id: string; status: string }> {
    if (this._shouldFail) {
      return Promise.reject(new Error('WhatsApp service unavailable'))
    }

    this._sentMessages.push({
      ...params,
      sentAt: new Date(),
      status: 'sent',
    })
    return Promise.resolve({ id: `wa-${Date.now()}`, status: 'sent' })
  }

  get sentMessages() {
    return [...this._sentMessages]
  }

  getMessagesTo(phone: string) {
    return this._sentMessages.filter(m => m.to === phone)
  }

  setFailure(shouldFail: boolean): void {
    this._shouldFail = shouldFail
  }

  reset(): void {
    this._sentMessages = []
    this._shouldFail = false
  }
}

export const mockWhatsAppService = new WhatsAppServiceMock()

/**
 * Get WhatsApp mock for vi.mock
 */
export function getWhatsAppMock() {
  return {
    sendWhatsAppMessage: vi.fn(async (params: { to: string; template?: string; message?: string; mediaUrl?: string }) =>
      mockWhatsAppService.send(params)
    ),
    sendWhatsAppTemplate: vi.fn(async (to: string, template: string, variables?: Record<string, string>) =>
      mockWhatsAppService.send({ to, template })
    ),
  }
}

/**
 * Mock Storage Service State
 */
class StorageServiceMock {
  private _uploadedFiles: Map<string, { content: Buffer | Blob; contentType: string; uploadedAt: Date }> = new Map()
  private _shouldFail: boolean = false

  upload(bucket: string, path: string, content: Buffer | Blob, contentType: string): Promise<{ path: string; url: string }> {
    if (this._shouldFail) {
      return Promise.reject(new Error('Storage service unavailable'))
    }

    const fullPath = `${bucket}/${path}`
    this._uploadedFiles.set(fullPath, { content, contentType, uploadedAt: new Date() })
    return Promise.resolve({
      path: fullPath,
      url: `https://test.supabase.co/storage/v1/object/public/${fullPath}`,
    })
  }

  download(bucket: string, path: string): Promise<Blob> {
    const fullPath = `${bucket}/${path}`
    const file = this._uploadedFiles.get(fullPath)
    if (!file) {
      return Promise.reject(new Error('File not found'))
    }
    if (file.content instanceof Blob) {
      return Promise.resolve(file.content)
    }
    // Convert Buffer to Uint8Array for Blob constructor compatibility
    return Promise.resolve(new Blob([new Uint8Array(file.content)]))
  }

  exists(bucket: string, path: string): boolean {
    return this._uploadedFiles.has(`${bucket}/${path}`)
  }

  get uploadedFiles() {
    return new Map(this._uploadedFiles)
  }

  setFailure(shouldFail: boolean): void {
    this._shouldFail = shouldFail
  }

  reset(): void {
    this._uploadedFiles.clear()
    this._shouldFail = false
  }
}

export const mockStorageService = new StorageServiceMock()

/**
 * Get enhanced Storage mock for vi.mock
 */
export function getStorageMock() {
  return {
    from: vi.fn((bucket: string) => ({
      upload: vi.fn(async (path: string, content: Buffer | Blob, options?: { contentType?: string }) =>
        mockStorageService.upload(bucket, path, content, options?.contentType || 'application/octet-stream')
      ),
      download: vi.fn(async (path: string) => ({
        data: await mockStorageService.download(bucket, path),
        error: null,
      })),
      getPublicUrl: vi.fn((path: string) => ({
        data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/${bucket}/${path}` },
      })),
      remove: vi.fn(async (paths: string[]) => ({ data: null, error: null })),
      list: vi.fn(async () => ({ data: [], error: null })),
    })),
  }
}

/**
 * Mock Cron Job Verification
 */
class CronJobMock {
  private _validSecret: string = 'test-cron-secret-valid'
  private _executedJobs: Array<{
    name: string
    executedAt: Date
    success: boolean
    itemsProcessed?: number
  }> = []

  /**
   * Verify cron secret
   */
  verifySecret(secret: string): boolean {
    return secret === this._validSecret
  }

  /**
   * Set valid secret
   */
  setValidSecret(secret: string): void {
    this._validSecret = secret
  }

  /**
   * Record job execution
   */
  recordExecution(name: string, success: boolean, itemsProcessed?: number): void {
    this._executedJobs.push({
      name,
      executedAt: new Date(),
      success,
      itemsProcessed,
    })
  }

  /**
   * Get executed jobs
   */
  get executedJobs() {
    return [...this._executedJobs]
  }

  /**
   * Get jobs by name
   */
  getJobsByName(name: string) {
    return this._executedJobs.filter(j => j.name === name)
  }

  /**
   * Reset state
   */
  reset(): void {
    this._validSecret = 'test-cron-secret-valid'
    this._executedJobs = []
  }
}

export const mockCronJob = new CronJobMock()

/**
 * Get Cron authorization mock
 */
export function getCronAuthMock() {
  return {
    verifyCronSecret: vi.fn((request: Request) => {
      const authHeader = request.headers.get('authorization')
      const secret = authHeader?.replace('Bearer ', '') || ''
      return mockCronJob.verifySecret(secret)
    }),
  }
}

// =============================================================================
// Global Reset Function
// =============================================================================

/**
 * Reset all mock services (for beforeEach)
 */
export function resetAllMocks(): void {
  mockState.reset()
  mockEmailService.reset()
  mockSmsService.reset()
  mockWhatsAppService.reset()
  mockStorageService.reset()
  mockCronJob.reset()
}

// =============================================================================
// Convenience Mock State Methods
// =============================================================================

// Add quick setup methods to mockState
Object.assign(mockState, {
  /**
   * Quick setup as vet
   */
  asVet(): void {
    mockState.setAuthScenario('VET')
  },

  /**
   * Quick setup as admin
   */
  asAdmin(): void {
    mockState.setAuthScenario('ADMIN')
  },

  /**
   * Quick setup as owner
   */
  asOwner(): void {
    mockState.setAuthScenario('OWNER')
  },

  /**
   * Quick setup as unauthenticated
   */
  asUnauthenticated(): void {
    mockState.setAuthScenario('UNAUTHENTICATED')
  },

  /**
   * Mock a query response for a table
   */
  mockQueryResponse(table: string, data: unknown): void {
    mockState.setTableResult(table, data)
  },

  /**
   * Mock an RPC response
   */
  mockRpcResponse(fn: string, data: unknown): void {
    mockState.setRpcResult(fn, data)
  },
})
