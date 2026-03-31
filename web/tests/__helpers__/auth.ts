/**
 * Authentication Test Helpers
 *
 * Utilities for managing authentication state in tests.
 */

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js'
import { UserFixture, DEFAULT_OWNER, DEFAULT_VET, DEFAULT_ADMIN } from '../__fixtures__/users'

// Auth client for testing
let authClient: SupabaseClient | null = null

/**
 * Get auth client for testing
 */
export function getAuthClient(): SupabaseClient {
  if (!authClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    authClient = createClient(supabaseUrl, supabaseKey)
  }
  return authClient
}

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  const client = getAuthClient()

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  return {
    user: data?.user || null,
    session: data?.session || null,
    error: error ? new Error(error.message) : null,
  }
}

/**
 * Sign in with a test user fixture
 */
export async function signInAs(
  user: UserFixture
): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  return signIn(user.email, user.password)
}

/**
 * Sign in as default owner
 */
export async function signInAsOwner() {
  return signInAs(DEFAULT_OWNER)
}

/**
 * Sign in as default vet
 */
export async function signInAsVet() {
  return signInAs(DEFAULT_VET)
}

/**
 * Sign in as default admin
 */
export async function signInAsAdmin() {
  return signInAs(DEFAULT_ADMIN)
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const client = getAuthClient()
  await client.auth.signOut()
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<Session | null> {
  const client = getAuthClient()
  const { data } = await client.auth.getSession()
  return data?.session || null
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const client = getAuthClient()
  const { data } = await client.auth.getUser()
  return data?.user || null
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession()
  return session !== null
}

/**
 * Create test user (requires service role)
 */
export async function createTestUser(
  email: string,
  password: string,
  metadata: Record<string, unknown> = {}
): Promise<{ user: User | null; error: Error | null }> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceKey || !supabaseUrl) {
    throw new Error('Missing service role key for user creation')
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })

  return {
    user: data?.user || null,
    error: error ? new Error(error.message) : null,
  }
}

/**
 * Delete test user (requires service role)
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceKey || !supabaseUrl) {
    throw new Error('Missing service role key for user deletion')
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`)
  }
}

/**
 * Authentication context for tests
 */
export class AuthTestContext {
  private createdUserIds: string[] = []
  private originalSession: Session | null = null

  /**
   * Save current session state before tests
   */
  async setup(): Promise<void> {
    this.originalSession = await getCurrentSession()
  }

  /**
   * Track created user for cleanup
   */
  trackUser(userId: string): void {
    this.createdUserIds.push(userId)
  }

  /**
   * Restore original session and clean up
   */
  async cleanup(): Promise<void> {
    // Sign out current test user
    await signOut()

    // Delete created test users
    for (const userId of this.createdUserIds) {
      try {
        await deleteTestUser(userId)
      } catch (error) {
        console.warn(`Failed to delete test user ${userId}:`, error)
      }
    }

    this.createdUserIds = []

    // Restore original session if needed
    // Note: This would require storing/restoring tokens
  }
}

/**
 * Mock authentication for unit tests (no real API calls)
 */
export function createMockAuthState(user: UserFixture): {
  user: Partial<User>
  session: Partial<Session>
} {
  return {
    user: {
      id: user.id,
      email: user.email,
      user_metadata: {
        full_name: user.fullName,
        role: user.role,
        tenant_id: user.tenantId,
      },
    },
    session: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
    },
  }
}

/**
 * Verify user has required role
 */
export async function verifyUserRole(expectedRole: 'owner' | 'vet' | 'admin'): Promise<boolean> {
  const client = getAuthClient()
  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) return false

  const { data: profile } = await client.from('profiles').select('role').eq('id', user.id).single()

  return profile?.role === expectedRole
}
