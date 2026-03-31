/**
 * Global mock for Next.js headers module
 * 
 * This mock provides a working implementation of cookies() and headers()
 * for tests that run outside of a Next.js request context.
 * 
 * Import this file in your test setup or individual test files that
 * test API routes using Next.js headers.
 */

import { vi } from 'vitest';

// Mock cookie store
const mockCookieStore = new Map<string, string>();

// Default auth cookie value for tests
const DEFAULT_AUTH_COOKIE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoic3RhZmYiLCJ0ZW5hbnRfaWQiOiJ0ZXN0LXRlbmFudCIsImV4cCI6OTk5OTk5OTk5OX0.test-signature';

// Pre-populate with auth cookie
mockCookieStore.set('sb-auth-token', DEFAULT_AUTH_COOKIE);

export const mockCookies = vi.fn(() => ({
  get: vi.fn((name: string) => {
    // Handle Supabase auth cookies
    if (name.startsWith('sb-')) {
      const value = mockCookieStore.get(name) || mockCookieStore.get('sb-auth-token');
      return value ? { name, value } : undefined;
    }
    const value = mockCookieStore.get(name);
    return value ? { name, value } : undefined;
  }),
  getAll: vi.fn(() => {
    return Array.from(mockCookieStore.entries()).map(([name, value]) => ({ name, value }));
  }),
  set: vi.fn((name: string, value: string) => {
    mockCookieStore.set(name, value);
  }),
  delete: vi.fn((name: string) => {
    mockCookieStore.delete(name);
  }),
  has: vi.fn((name: string) => mockCookieStore.has(name)),
}));

export const mockHeaders = vi.fn(() => {
  const headerMap = new Map<string, string>([
    ['content-type', 'application/json'],
    ['accept', 'application/json'],
    ['x-tenant-id', 'test-tenant'],
  ]);
  
  return {
    get: (name: string) => headerMap.get(name.toLowerCase()),
    has: (name: string) => headerMap.has(name.toLowerCase()),
    entries: () => headerMap.entries(),
    keys: () => headerMap.keys(),
    values: () => headerMap.values(),
    forEach: (fn: (value: string, key: string) => void) => headerMap.forEach(fn),
  };
});

// Setup the mock
vi.mock('next/headers', () => ({
  cookies: mockCookies,
  headers: mockHeaders,
}));

// Helper functions for tests

/**
 * Set a specific cookie value for tests
 */
export function setTestCookie(name: string, value: string) {
  mockCookieStore.set(name, value);
}

/**
 * Clear all test cookies
 */
export function clearTestCookies() {
  mockCookieStore.clear();
  // Re-add default auth cookie
  mockCookieStore.set('sb-auth-token', DEFAULT_AUTH_COOKIE);
}

/**
 * Set authenticated user cookie for tests
 */
export function setAuthenticatedUser(options: {
  userId?: string;
  email?: string;
  role?: 'owner' | 'staff' | 'admin' | 'vet';
  tenantId?: string;
} = {}) {
  const payload = {
    sub: options.userId || 'test-user-id',
    email: options.email || 'test@example.com',
    role: options.role || 'staff',
    tenant_id: options.tenantId || 'test-tenant',
    exp: 9999999999,
  };
  
  // Create a simple base64 encoded token (not a real JWT, but works for mocking)
  const token = `eyJ0eXAiOiJKV1QifQ.${btoa(JSON.stringify(payload))}.mock-signature`;
  mockCookieStore.set('sb-auth-token', token);
}

/**
 * Clear authentication for tests
 */
export function clearAuthentication() {
  mockCookieStore.delete('sb-auth-token');
}

export default {
  mockCookies,
  mockHeaders,
  setTestCookie,
  clearTestCookies,
  setAuthenticatedUser,
  clearAuthentication,
};
