/**
 * Authentication Mock Helpers
 * 
 * Provides utilities for mocking authenticated and unauthenticated states
 * in tests. Works with both Supabase auth and Next.js cookies.
 */

import { vi } from 'vitest';

export interface TestUser {
  id: string;
  email: string;
  role: 'owner' | 'staff' | 'admin' | 'vet' | 'superadmin';
  tenantId: string;
  ownerId?: string;
  metadata?: Record<string, unknown>;
}

export const defaultTestUser: TestUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'staff',
  tenantId: 'test-tenant',
};

export const defaultOwnerUser: TestUser = {
  id: 'test-owner-id',
  email: 'owner@example.com',
  role: 'owner',
  tenantId: 'test-tenant',
  ownerId: 'test-owner-id',
};

export const defaultAdminUser: TestUser = {
  id: 'test-admin-id',
  email: 'admin@example.com',
  role: 'admin',
  tenantId: 'test-tenant',
};

export const defaultVetUser: TestUser = {
  id: 'test-vet-id',
  email: 'vet@example.com',
  role: 'vet',
  tenantId: 'test-tenant',
};

/**
 * Creates a mock Supabase user object
 */
export function createMockUser(user: Partial<TestUser> = {}) {
  const merged = { ...defaultTestUser, ...user };
  return {
    id: merged.id,
    email: merged.email,
    app_metadata: {
      provider: 'email',
    },
    user_metadata: {
      role: merged.role,
      tenant_id: merged.tenantId,
      owner_id: merged.ownerId,
      ...merged.metadata,
    },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    role: 'authenticated',
  };
}

/**
 * Creates a mock Supabase session object
 */
export function createMockSession(user: Partial<TestUser> = {}) {
  const mockUser = createMockUser(user);
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: mockUser,
  };
}

/**
 * Mocks an authenticated user on a Supabase client mock
 */
export function mockAuthenticatedUser(
  mockSupabase: { auth: { getUser: ReturnType<typeof vi.fn>; getSession: ReturnType<typeof vi.fn> } },
  user: Partial<TestUser> = {}
) {
  const mockUser = createMockUser(user);
  const mockSession = createMockSession(user);
  
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null,
  });
  
  mockSupabase.auth.getSession.mockResolvedValue({
    data: { session: mockSession },
    error: null,
  });
}

/**
 * Mocks an unauthenticated state
 */
export function mockUnauthenticated(
  mockSupabase: { auth: { getUser: ReturnType<typeof vi.fn>; getSession: ReturnType<typeof vi.fn> } }
) {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
  
  mockSupabase.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
}

/**
 * Mocks an expired/invalid token
 */
export function mockExpiredToken(
  mockSupabase: { auth: { getUser: ReturnType<typeof vi.fn>; getSession: ReturnType<typeof vi.fn> } }
) {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'Token expired', status: 401 },
  });
  
  mockSupabase.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: { message: 'Token expired', status: 401 },
  });
}

/**
 * Mocks a specific role for testing authorization
 */
export function mockUserWithRole(
  mockSupabase: { auth: { getUser: ReturnType<typeof vi.fn>; getSession: ReturnType<typeof vi.fn> } },
  role: TestUser['role'],
  tenantId: string = 'test-tenant'
) {
  mockAuthenticatedUser(mockSupabase, { role, tenantId });
}

/**
 * Mocks an owner user with specific owner ID
 */
export function mockOwnerUser(
  mockSupabase: { auth: { getUser: ReturnType<typeof vi.fn>; getSession: ReturnType<typeof vi.fn> } },
  ownerId: string,
  tenantId: string = 'test-tenant'
) {
  mockAuthenticatedUser(mockSupabase, {
    ...defaultOwnerUser,
    ownerId,
    tenantId,
  });
}

/**
 * Mocks a user from a different tenant (for cross-tenant testing)
 */
export function mockCrossTenantUser(
  mockSupabase: { auth: { getUser: ReturnType<typeof vi.fn>; getSession: ReturnType<typeof vi.fn> } },
  tenantId: string = 'other-tenant'
) {
  mockAuthenticatedUser(mockSupabase, {
    ...defaultTestUser,
    tenantId,
  });
}

/**
 * Creates test context with user info
 */
export function createTestContext(user: Partial<TestUser> = {}) {
  const merged = { ...defaultTestUser, ...user };
  return {
    userId: merged.id,
    tenantId: merged.tenantId,
    role: merged.role,
    ownerId: merged.ownerId,
    isOwner: merged.role === 'owner',
    isStaff: ['staff', 'admin', 'vet', 'superadmin'].includes(merged.role),
    isAdmin: ['admin', 'superadmin'].includes(merged.role),
    isVet: merged.role === 'vet',
  };
}

export default {
  defaultTestUser,
  defaultOwnerUser,
  defaultAdminUser,
  defaultVetUser,
  createMockUser,
  createMockSession,
  mockAuthenticatedUser,
  mockUnauthenticated,
  mockExpiredToken,
  mockUserWithRole,
  mockOwnerUser,
  mockCrossTenantUser,
  createTestContext,
};
