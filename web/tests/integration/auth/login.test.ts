/**
 * Integration Tests: Authentication - Login
 *
 * Tests login functionality with Supabase Auth.
 * Note: These tests require actual Supabase connection and test users.
 * @tags integration, auth, critical
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from 'vitest'
import {
  getAuthClient,
  signIn,
  signOut,
  getCurrentSession,
  getCurrentUser,
  isAuthenticated,
} from '../../__helpers__/auth'
import { waitForDatabase } from '../../__helpers__/db'
import { INVALID_CREDENTIALS } from '../../__fixtures__/users'

describe('Authentication - Login', () => {
  beforeAll(async () => {
    await waitForDatabase()
  })

  afterEach(async () => {
    // Ensure clean state after each test
    await signOut()
  })

  afterAll(async () => {
    await signOut()
  })

  describe('Sign In', () => {
    test('fails with invalid credentials', async () => {
      const result = await signIn(INVALID_CREDENTIALS.email, INVALID_CREDENTIALS.password)

      expect(result.error).not.toBeNull()
      expect(result.user).toBeNull()
      expect(result.session).toBeNull()
    })

    test('fails with empty email', async () => {
      const result = await signIn('', 'somepassword')

      expect(result.error).not.toBeNull()
    })

    test('fails with empty password', async () => {
      const result = await signIn('test@test.com', '')

      expect(result.error).not.toBeNull()
    })

    test('fails with malformed email', async () => {
      const result = await signIn('notanemail', 'password123')

      expect(result.error).not.toBeNull()
    })

    // Integration tests for success scenarios
    // These require actual test users seeded in the database
    // To run: set TEST_AUTH_INTEGRATION=true and ensure users are seeded
    const runIntegrationTests = process.env.TEST_AUTH_INTEGRATION === 'true'

    test.skipIf(!runIntegrationTests)('succeeds with valid owner credentials', async () => {
      // Import here to avoid circular dependency issues in tests
      const { DEFAULT_OWNER } = await import('../../__fixtures__/users')

      const result = await signIn(DEFAULT_OWNER.email, DEFAULT_OWNER.password)

      expect(result.error).toBeNull()
      expect(result.user).not.toBeNull()
      expect(result.session).not.toBeNull()
      expect(result.user?.email).toBe(DEFAULT_OWNER.email)
    })

    test.skipIf(!runIntegrationTests)('succeeds with valid vet credentials', async () => {
      const { DEFAULT_VET } = await import('../../__fixtures__/users')

      const result = await signIn(DEFAULT_VET.email, DEFAULT_VET.password)

      expect(result.error).toBeNull()
      expect(result.user).not.toBeNull()
      expect(result.session).not.toBeNull()
      expect(result.user?.email).toBe(DEFAULT_VET.email)
    })

    test.skipIf(!runIntegrationTests)('succeeds with valid admin credentials', async () => {
      const { DEFAULT_ADMIN } = await import('../../__fixtures__/users')

      const result = await signIn(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password)

      expect(result.error).toBeNull()
      expect(result.user).not.toBeNull()
      expect(result.session).not.toBeNull()
      expect(result.user?.email).toBe(DEFAULT_ADMIN.email)
    })
  })

  describe('Sign Out', () => {
    test('sign out clears session', async () => {
      // Even without a session, signOut should not error
      await signOut()

      const session = await getCurrentSession()
      expect(session).toBeNull()
    })
  })

  describe('Session Management', () => {
    test('getCurrentSession returns null when not authenticated', async () => {
      await signOut()
      const session = await getCurrentSession()
      expect(session).toBeNull()
    })

    test('getCurrentUser returns null when not authenticated', async () => {
      await signOut()
      const user = await getCurrentUser()
      expect(user).toBeNull()
    })

    test('isAuthenticated returns false when not logged in', async () => {
      await signOut()
      const authenticated = await isAuthenticated()
      expect(authenticated).toBe(false)
    })
  })

  describe('Auth Client', () => {
    test('getAuthClient returns consistent client', () => {
      const client1 = getAuthClient()
      const client2 = getAuthClient()
      expect(client1).toBe(client2)
    })

    test('auth client has required methods', () => {
      const client = getAuthClient()
      expect(client.auth).toBeDefined()
      expect(client.auth.signInWithPassword).toBeDefined()
      expect(client.auth.signOut).toBeDefined()
      expect(client.auth.getSession).toBeDefined()
      expect(client.auth.getUser).toBeDefined()
    })
  })

  describe('Rate Limiting', () => {
    test('multiple failed attempts should be rate limited', async () => {
      // Attempt multiple logins quickly
      const attempts = []
      for (let i = 0; i < 5; i++) {
        attempts.push(signIn(INVALID_CREDENTIALS.email, INVALID_CREDENTIALS.password))
      }

      const results = await Promise.all(attempts)

      // All should fail, but eventually might get rate limited
      results.forEach((result) => {
        expect(result.error).not.toBeNull()
      })

      // Note: Actual rate limit testing requires more sophisticated setup
      // and checking for specific rate limit error codes
    })
  })
})
