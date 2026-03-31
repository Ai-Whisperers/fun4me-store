/**
 * Mock Authentication State for Testing
 *
 * Provides a clean mock system for testing authentication
 * without making real Supabase API calls during unit tests.
 */

import { UserFixture, DEFAULT_OWNER, DEFAULT_VET, DEFAULT_ADMIN } from '../__fixtures__/users'
import { User, Session } from '@supabase/supabase-js'

export interface MockAuthState {
  user: Partial<User> | null
  session: Partial<Session> | null
  userFixture: UserFixture | null
  currentRole: 'UNAUTHENTICATED' | 'OWNER' | 'VET' | 'ADMIN' | null
}

export class AuthState {
  private state: MockAuthState = {
    user: null,
    session: null,
    userFixture: null,
    currentRole: null,
  }

  /**
   * Set authentication scenario for testing
   */
  setAuthScenario(
    scenario: 'UNAUTHENTICATED' | 'OWNER' | 'VET' | 'ADMIN' | 'CUSTOM',
    customUser?: UserFixture
  ): AuthState {
    switch (scenario) {
      case 'UNAUTHENTICATED':
        this.state = {
          user: null,
          session: null,
          userFixture: null,
          currentRole: 'UNAUTHENTICATED',
        }
        break

      case 'OWNER':
        this.state = {
          user: this.createUserFromFixture(DEFAULT_OWNER),
          session: this.createSessionFromFixture(DEFAULT_OWNER),
          userFixture: DEFAULT_OWNER,
          currentRole: 'OWNER',
        }
        break

      case 'VET':
        this.state = {
          user: this.createUserFromFixture(DEFAULT_VET),
          session: this.createSessionFromFixture(DEFAULT_VET),
          userFixture: DEFAULT_VET,
          currentRole: 'VET',
        }
        break

      case 'ADMIN':
        this.state = {
          user: this.createUserFromFixture(DEFAULT_ADMIN),
          session: this.createSessionFromFixture(DEFAULT_ADMIN),
          userFixture: DEFAULT_ADMIN,
          currentRole: 'ADMIN',
        }
        break

      case 'CUSTOM':
        if (!customUser) {
          throw new Error('CUSTOM scenario requires customUser parameter')
        }
        this.state = {
          user: this.createUserFromFixture(customUser),
          session: this.createSessionFromFixture(customUser),
          userFixture: customUser,
          currentRole: this.getRoleFromFixture(customUser),
        }
        break

      default:
        throw new Error(`Unknown auth scenario: ${scenario}`)
    }

    return this
  }

  /**
   * Get current mock user
   */
  getUser(): Partial<User> | null {
    return this.state.user
  }

  /**
   * Get current mock session
   */
  getSession(): Partial<Session> | null {
    return this.state.session
  }

  /**
   * Get current user fixture
   */
  getUserFixture(): UserFixture | null {
    return this.state.userFixture
  }

  /**
   * Get current role
   */
  getCurrentRole(): string | null {
    return this.state.currentRole
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.state.user !== null && this.state.session !== null
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: 'OWNER' | 'VET' | 'ADMIN'): boolean {
    return this.state.currentRole === role
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: ('OWNER' | 'VET' | 'ADMIN')[]): boolean {
    return roles.includes(this.state.currentRole as any)
  }

  /**
   * Check if user owns a resource (by owner_id field)
   */
  ownsResource(resource: any): boolean {
    if (!this.state.userFixture || !this.isAuthenticated()) {
      return false
    }

    // For owner role, check if resource owner_id matches current user
    if (this.state.currentRole === 'OWNER') {
      return resource?.owner_id === this.state.userFixture.id
    }

    // For staff roles, always return true (they can access any tenant resource)
    return this.state.currentRole === 'VET' || this.state.currentRole === 'ADMIN'
  }

  /**
   * Check if user can access tenant
   */
  canAccessTenant(tenantId: string): boolean {
    if (!this.state.userFixture || !this.isAuthenticated()) {
      return false
    }

    return this.state.userFixture.tenantId === tenantId
  }

  /**
   * Reset auth state
   */
  reset(): AuthState {
    this.state = {
      user: null,
      session: null,
      userFixture: null,
      currentRole: null,
    }

    return this
  }

  /**
   * Get tenant_id for database queries
   */
  getTenantId(): string | null {
    return this.state.userFixture?.tenantId || null
  }

  /**
   * Get user_id for database queries
   */
  getUserId(): string | null {
    return this.state.userFixture?.id || null
  }

  /**
   * Create Supabase User object from fixture
   */
  private createUserFromFixture(fixture: UserFixture): Partial<User> {
    return {
      id: fixture.id,
      email: fixture.email,
      user_metadata: {
        full_name: fixture.fullName,
        role: fixture.role,
        tenant_id: fixture.tenantId,
        phone: fixture.phone,
        client_code: fixture.clientCode,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  /**
   * Create Supabase Session object from fixture
   */
  private createSessionFromFixture(fixture: UserFixture): Partial<Session> {
    return {
      access_token: `mock-access-token-${fixture.id}`,
      refresh_token: `mock-refresh-token-${fixture.id}`,
      expires_in: 3600,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      token_type: 'bearer',
      user: this.createUserFromFixture(fixture),
    }
  }

  /**
   * Get role from user fixture
   */
  private getRoleFromFixture(fixture: UserFixture): 'OWNER' | 'VET' | 'ADMIN' {
    return fixture.role.toUpperCase() as any
  }

  /**
   * Get auth headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.isAuthenticated()) {
      return {}
    }

    return {
      Authorization: `Bearer ${this.state.session?.access_token || ''}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Get tenant headers for multi-tenant requests
   */
  getTenantHeaders(): Record<string, string> {
    if (!this.state.userFixture?.tenantId) {
      return {}
    }

    return {
      'X-Tenant-ID': this.state.userFixture.tenantId,
      'X-User-Role': this.state.currentRole || '',
    }
  }

  /**
   * Get all headers for API requests
   */
  getAllHeaders(): Record<string, string> {
    return {
      ...this.getAuthHeaders(),
      ...this.getTenantHeaders(),
    }
  }

  /**
   * Get current state for debugging
   */
  debug(): MockAuthState {
    return { ...this.state }
  }

  /**
   * Create a mock error for testing
   */
  createMockError(message: string, code?: string): Error {
    const error = new Error(message) as any
    error.code = code || 'MOCK_ERROR'
    error.status = 400
    return error
  }

  /**
   * Create mock API response
   */
  createMockResponse<T>(
    data: T,
    status: number = 200,
    headers: Record<string, string> = {}
  ): { data: T; status: number; headers: Record<string, string> } {
    return {
      data,
      status,
      headers,
    }
  }

  /**
   * Create mock error response
   */
  createMockErrorResponse(
    error: string,
    status: number = 400,
    headers: Record<string, string> = {}
  ): { error: string; status: number; headers: Record<string, string> } {
    return {
      error,
      status,
      headers,
    }
  }
}

/**
 * Global mock state instance for tests
 */
let globalAuthState: AuthState | null = null

/**
 * Get or create global auth state
 */
export function createMockAuthState(): AuthState {
  if (!globalAuthState) {
    globalAuthState = new AuthState()
  }
  return globalAuthState
}

/**
 * Reset global auth state
 */
export function resetMockAuthState(): void {
  if (globalAuthState) {
    globalAuthState.reset()
  }
}

/**
 * Quick accessors for common scenarios
 */
export function setUnauthenticated(): AuthState {
  return createMockAuthState().setAuthScenario('UNAUTHENTICATED')
}

export function setOwner(user?: UserFixture): AuthState {
  return user 
    ? createMockAuthState().setAuthScenario('CUSTOM', user)
    : createMockAuthState().setAuthScenario('OWNER')
}

export function setVet(user?: UserFixture): AuthState {
  return user 
    ? createMockAuthState().setAuthScenario('CUSTOM', user)
    : createMockAuthState().setAuthScenario('VET')
}

export function setAdmin(user?: UserFixture): AuthState {
  return user 
    ? createMockAuthState().setAuthScenario('CUSTOM', user)
    : createMockAuthState().setAuthScenario('ADMIN')
}

/**
 * Helper for test setup
 */
export function setupTestAuth(
  role: 'owner' | 'vet' | 'admin',
  user?: UserFixture
): AuthState {
  const scenario = role.toUpperCase() as any
  return user 
    ? createMockAuthState().setAuthScenario('CUSTOM', user)
    : createMockAuthState().setAuthScenario(scenario)
}

/**
 * Helper for creating custom test users
 */
export function createTestUserFixture(
  overrides: Partial<UserFixture> = {}
): UserFixture {
  return {
    id: `test-user-${Date.now()}`,
    email: `test-${Date.now()}@test.local`,
    password: 'TestPassword123!',
    fullName: 'Test User',
    phone: '+595981234567',
    role: 'owner',
    tenantId: 'test-tenant',
    clientCode: 'TEST-001',
    ...overrides,
  }
}