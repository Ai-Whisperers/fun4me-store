/**
 * Authorization Test Suite
 *
 * Reusable test generators for authorization scenarios.
 * Eliminates 40-60 lines of repeated auth tests per endpoint.
 *
 * @example
 * ```typescript
 * import { testStaffOnlyEndpoint } from '@/lib/test-utils';
 * import { POST } from '@/app/api/invoices/[id]/record-payment/route';
 *
 * testStaffOnlyEndpoint(
 *   POST,
 *   () => new NextRequest(url, { method: 'POST', body: JSON.stringify(payload) }),
 *   'Record Payment',
 *   () => ({ params: Promise.resolve({ id: 'invoice-123' }) })
 * );
 *
 * // Generates 5 tests:
 * // - should reject unauthenticated requests with 401
 * // - should reject owner role
 * // - should allow vet role
 * // - should allow admin role
 * // - should reject user with missing profile
 * ```
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockState, AuthScenario } from './mock-presets'

// =============================================================================
// Types
// =============================================================================

export type Role = 'owner' | 'vet' | 'admin'

export interface AuthTestConfig {
  /**
   * The route handler function to test
   * Supports both optional and required params handlers with flexible context types
   */
  handler: (request: NextRequest, context?: unknown) => Promise<Response>

  /**
   * Factory function to create the request for each test
   */
  createRequest: () => NextRequest

  /**
   * Optional factory for route context (params)
   */
  createContext?: () => { params: Promise<Record<string, string>> }

  /**
   * Roles that should be allowed to access the endpoint
   */
  allowedRoles: Role[]

  /**
   * Human-readable name for the resource/endpoint
   */
  resourceName: string

  /**
   * Expected error code for unauthorized (default: 'AUTH_REQUIRED')
   */
  unauthorizedCode?: string

  /**
   * Expected error code for forbidden (default: 'INSUFFICIENT_ROLE')
   */
  forbiddenCode?: string

  /**
   * Skip specific tests (useful for edge cases)
   */
  skip?: {
    unauthenticated?: boolean
    missingProfile?: boolean
    roleTests?: boolean
  }
}

// =============================================================================
// Main Test Generator
// =============================================================================

/**
 * Generate complete authorization test suite for an endpoint
 */
export function testAuthorizationScenarios(config: AuthTestConfig): void {
  const {
    handler,
    createRequest,
    createContext,
    allowedRoles,
    resourceName,
    unauthorizedCode = 'AUTH_REQUIRED',
    forbiddenCode = 'INSUFFICIENT_ROLE',
    skip = {},
  } = config

  describe(`${resourceName} - Authorization`, () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockState.reset()
    })

    if (!skip.unauthenticated) {
      it('should reject unauthenticated requests with 401', async () => {
        mockState.setAuthScenario('UNAUTHENTICATED')

        const context = createContext?.()
        const response = await handler(createRequest(), context)
        const json = await response.json()

        expect(response.status).toBe(401)
        expect(json.code).toBe(unauthorizedCode)
      })
    }

    if (!skip.roleTests) {
      const roles: Role[] = ['owner', 'vet', 'admin']

      roles.forEach((role) => {
        const scenario = role.toUpperCase() as AuthScenario
        const shouldAllow = allowedRoles.includes(role)

        it(`should ${shouldAllow ? 'allow' : 'reject'} ${role} role`, async () => {
          mockState.setAuthScenario(scenario)

          const context = createContext?.()
          const response = await handler(createRequest(), context)

          if (shouldAllow) {
            // Should not be 401 or 403
            expect(response.status).not.toBe(401)
            expect(response.status).not.toBe(403)
          } else {
            expect(response.status).toBe(403)
            const json = await response.json()
            expect(json.code).toBe(forbiddenCode)
          }
        })
      })
    }

    if (!skip.missingProfile) {
      it('should reject user with missing profile', async () => {
        mockState.setUser({ id: 'orphan-user', email: 'orphan@test.com' })
        mockState.setProfile(null)

        const context = createContext?.()
        const response = await handler(createRequest(), context)

        expect(response.status).toBe(403)
      })
    }
  })
}

// =============================================================================
// Convenience Wrappers
// =============================================================================

/**
 * Test endpoint that only allows vet and admin roles
 */
export function testStaffOnlyEndpoint(
  handler: AuthTestConfig['handler'],
  createRequest: AuthTestConfig['createRequest'],
  resourceName: string,
  createContext?: AuthTestConfig['createContext']
): void {
  testAuthorizationScenarios({
    handler,
    createRequest,
    createContext,
    allowedRoles: ['vet', 'admin'],
    resourceName,
  })
}

/**
 * Test endpoint that only allows admin role
 */
export function testAdminOnlyEndpoint(
  handler: AuthTestConfig['handler'],
  createRequest: AuthTestConfig['createRequest'],
  resourceName: string,
  createContext?: AuthTestConfig['createContext']
): void {
  testAuthorizationScenarios({
    handler,
    createRequest,
    createContext,
    allowedRoles: ['admin'],
    resourceName,
  })
}

/**
 * Test endpoint that allows all authenticated users
 */
export function testAuthenticatedEndpoint(
  handler: AuthTestConfig['handler'],
  createRequest: AuthTestConfig['createRequest'],
  resourceName: string,
  createContext?: AuthTestConfig['createContext']
): void {
  testAuthorizationScenarios({
    handler,
    createRequest,
    createContext,
    allowedRoles: ['owner', 'vet', 'admin'],
    resourceName,
    skip: { roleTests: true }, // All roles allowed, skip role-specific tests
  })
}

/**
 * Test endpoint that only allows owner role (for owner-specific operations)
 */
export function testOwnerOnlyEndpoint(
  handler: AuthTestConfig['handler'],
  createRequest: AuthTestConfig['createRequest'],
  resourceName: string,
  createContext?: AuthTestConfig['createContext']
): void {
  testAuthorizationScenarios({
    handler,
    createRequest,
    createContext,
    allowedRoles: ['owner'],
    resourceName,
  })
}

// =============================================================================
// Individual Test Helpers
// =============================================================================

/**
 * Test a single authorization scenario
 */
export async function testAuthScenario(
  handler: AuthTestConfig['handler'],
  createRequest: AuthTestConfig['createRequest'],
  scenario: AuthScenario,
  expectedStatus: number,
  createContext?: AuthTestConfig['createContext']
): Promise<Response> {
  mockState.setAuthScenario(scenario)
  const context = createContext?.()
  const response = await handler(createRequest(), context)
  expect(response.status).toBe(expectedStatus)
  return response
}

/**
 * Test that an endpoint returns 401 for unauthenticated request
 */
export async function expectUnauthorized(
  handler: AuthTestConfig['handler'],
  createRequest: AuthTestConfig['createRequest'],
  createContext?: AuthTestConfig['createContext']
): Promise<void> {
  mockState.setAuthScenario('UNAUTHENTICATED')
  const response = await handler(createRequest(), createContext?.())
  const json = await response.json()
  expect(response.status).toBe(401)
  expect(json.code).toBe('AUTH_REQUIRED')
}

/**
 * Test that an endpoint returns 403 for forbidden role
 */
export async function expectForbidden(
  handler: AuthTestConfig['handler'],
  createRequest: AuthTestConfig['createRequest'],
  scenario: AuthScenario,
  createContext?: AuthTestConfig['createContext']
): Promise<void> {
  mockState.setAuthScenario(scenario)
  const response = await handler(createRequest(), createContext?.())
  const json = await response.json()
  expect(response.status).toBe(403)
  expect(json.code).toBe('INSUFFICIENT_ROLE')
}
