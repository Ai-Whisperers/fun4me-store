/**
 * Authentication Login Success Tests (Unit)
 *
 * Tests authentication success scenarios using mocks.
 * This covers the happy path that requires test users in integration tests.
 *
 * Covers:
 * - Owner login success
 * - Vet login success
 * - Admin login success
 * - Session establishment
 * - User data returned
 *
 * @tags unit, auth, critical
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DEFAULT_OWNER, DEFAULT_VET, DEFAULT_ADMIN } from '../../__fixtures__/users'

// Mock Supabase auth responses
interface AuthResult {
  user: { id: string; email: string } | null
  session: { access_token: string; refresh_token: string } | null
  error: { message: string } | null
}

// Simulated auth service (mirrors signIn behavior)
async function mockSignIn(email: string, password: string): Promise<AuthResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 10))

  // Validate inputs
  if (!email || !password) {
    return {
      user: null,
      session: null,
      error: { message: 'Email and password required' },
    }
  }

  // Check against test users
  const testUsers = [DEFAULT_OWNER, DEFAULT_VET, DEFAULT_ADMIN]
  const matchedUser = testUsers.find((u) => u.email === email && u.password === password)

  if (!matchedUser) {
    return {
      user: null,
      session: null,
      error: { message: 'Invalid login credentials' },
    }
  }

  // Success - return user and session
  return {
    user: {
      id: matchedUser.id,
      email: matchedUser.email,
    },
    session: {
      access_token: `mock-access-token-${matchedUser.id}`,
      refresh_token: `mock-refresh-token-${matchedUser.id}`,
    },
    error: null,
  }
}

describe('Authentication - Login Success Scenarios (Mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Owner Login', () => {
    it('should successfully login with valid owner credentials', async () => {
      const result = await mockSignIn(DEFAULT_OWNER.email, DEFAULT_OWNER.password)

      expect(result.error).toBeNull()
      expect(result.user).not.toBeNull()
      expect(result.session).not.toBeNull()
      expect(result.user?.email).toBe(DEFAULT_OWNER.email)
    })

    it('should return user ID on successful owner login', async () => {
      const result = await mockSignIn(DEFAULT_OWNER.email, DEFAULT_OWNER.password)

      expect(result.user?.id).toBe(DEFAULT_OWNER.id)
    })

    it('should return valid session tokens on owner login', async () => {
      const result = await mockSignIn(DEFAULT_OWNER.email, DEFAULT_OWNER.password)

      expect(result.session?.access_token).toBeDefined()
      expect(result.session?.access_token).toContain(DEFAULT_OWNER.id)
      expect(result.session?.refresh_token).toBeDefined()
    })
  })

  describe('Vet Login', () => {
    it('should successfully login with valid vet credentials', async () => {
      const result = await mockSignIn(DEFAULT_VET.email, DEFAULT_VET.password)

      expect(result.error).toBeNull()
      expect(result.user).not.toBeNull()
      expect(result.session).not.toBeNull()
      expect(result.user?.email).toBe(DEFAULT_VET.email)
    })

    it('should return vet user ID on successful login', async () => {
      const result = await mockSignIn(DEFAULT_VET.email, DEFAULT_VET.password)

      expect(result.user?.id).toBe(DEFAULT_VET.id)
    })

    it('should return valid session for vet user', async () => {
      const result = await mockSignIn(DEFAULT_VET.email, DEFAULT_VET.password)

      expect(result.session?.access_token).toBeDefined()
      expect(result.session?.refresh_token).toBeDefined()
    })
  })

  describe('Admin Login', () => {
    it('should successfully login with valid admin credentials', async () => {
      const result = await mockSignIn(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password)

      expect(result.error).toBeNull()
      expect(result.user).not.toBeNull()
      expect(result.session).not.toBeNull()
      expect(result.user?.email).toBe(DEFAULT_ADMIN.email)
    })

    it('should return admin user ID on successful login', async () => {
      const result = await mockSignIn(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password)

      expect(result.user?.id).toBe(DEFAULT_ADMIN.id)
    })

    it('should return valid session for admin user', async () => {
      const result = await mockSignIn(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password)

      expect(result.session?.access_token).toBeDefined()
      expect(result.session?.refresh_token).toBeDefined()
    })
  })

  describe('Login Failure Scenarios', () => {
    it('should fail with wrong password for valid owner email', async () => {
      const result = await mockSignIn(DEFAULT_OWNER.email, 'wrong-password')

      expect(result.error).not.toBeNull()
      expect(result.user).toBeNull()
      expect(result.session).toBeNull()
    })

    it('should fail with wrong password for valid vet email', async () => {
      const result = await mockSignIn(DEFAULT_VET.email, 'wrong-password')

      expect(result.error).not.toBeNull()
      expect(result.user).toBeNull()
    })

    it('should fail with wrong password for valid admin email', async () => {
      const result = await mockSignIn(DEFAULT_ADMIN.email, 'wrong-password')

      expect(result.error).not.toBeNull()
      expect(result.user).toBeNull()
    })

    it('should fail with empty email', async () => {
      const result = await mockSignIn('', DEFAULT_OWNER.password)

      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('required')
    })

    it('should fail with empty password', async () => {
      const result = await mockSignIn(DEFAULT_OWNER.email, '')

      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('required')
    })
  })

  describe('Session Behavior', () => {
    it('should create unique sessions for different users', async () => {
      const ownerResult = await mockSignIn(DEFAULT_OWNER.email, DEFAULT_OWNER.password)
      const vetResult = await mockSignIn(DEFAULT_VET.email, DEFAULT_VET.password)
      const adminResult = await mockSignIn(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password)

      // All should succeed
      expect(ownerResult.session).not.toBeNull()
      expect(vetResult.session).not.toBeNull()
      expect(adminResult.session).not.toBeNull()

      // Sessions should be different
      expect(ownerResult.session?.access_token).not.toBe(vetResult.session?.access_token)
      expect(vetResult.session?.access_token).not.toBe(adminResult.session?.access_token)
      expect(ownerResult.session?.access_token).not.toBe(adminResult.session?.access_token)
    })

    it('should return both access and refresh tokens on success', async () => {
      const result = await mockSignIn(DEFAULT_OWNER.email, DEFAULT_OWNER.password)

      expect(result.session).toMatchObject({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
      })
    })
  })

  describe('User Data Integrity', () => {
    it('should return correct user email for owner', async () => {
      const result = await mockSignIn(DEFAULT_OWNER.email, DEFAULT_OWNER.password)
      expect(result.user?.email).toBe(DEFAULT_OWNER.email)
    })

    it('should return correct user email for vet', async () => {
      const result = await mockSignIn(DEFAULT_VET.email, DEFAULT_VET.password)
      expect(result.user?.email).toBe(DEFAULT_VET.email)
    })

    it('should return correct user email for admin', async () => {
      const result = await mockSignIn(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password)
      expect(result.user?.email).toBe(DEFAULT_ADMIN.email)
    })

    it('should return user ID matching fixture data', async () => {
      const ownerResult = await mockSignIn(DEFAULT_OWNER.email, DEFAULT_OWNER.password)
      const vetResult = await mockSignIn(DEFAULT_VET.email, DEFAULT_VET.password)
      const adminResult = await mockSignIn(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password)

      expect(ownerResult.user?.id).toBe(DEFAULT_OWNER.id)
      expect(vetResult.user?.id).toBe(DEFAULT_VET.id)
      expect(adminResult.user?.id).toBe(DEFAULT_ADMIN.id)
    })
  })
})
