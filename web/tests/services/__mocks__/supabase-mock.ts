/**
 * Supabase Client Mock for Service Layer Testing
 *
 * Provides a fully mockable Supabase client for testing services
 * without hitting a real database.
 */

import { vi } from 'vitest';

type MockResponse<T> = {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number;
};

type QueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
};

/**
 * Creates a chainable query builder mock
 */
function createQueryBuilder(response: MockResponse<unknown>): QueryBuilder {
  const builder: QueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(response),
    maybeSingle: vi.fn().mockResolvedValue(response),
  };

  // Make all methods return the builder for chaining, except terminal methods
  Object.keys(builder).forEach((key) => {
    if (key !== 'single' && key !== 'maybeSingle') {
      (builder as Record<string, ReturnType<typeof vi.fn>>)[key].mockImplementation(() => {
        // Return a promise with data for non-terminal methods
        const promise = Promise.resolve(response) as Promise<MockResponse<unknown>> & QueryBuilder;
        Object.assign(promise, builder);
        return promise;
      });
    }
  });

  return builder;
}

/**
 * Creates a mock Supabase client
 */
export function createMockSupabaseClient() {
  const mockQueryBuilder = createQueryBuilder({ data: null, error: null });

  const mockClient = {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    _queryBuilder: mockQueryBuilder,
  };

  return mockClient;
}

/**
 * Helper to set up mock responses for a specific table
 */
export function mockTableResponse<T>(
  mockClient: ReturnType<typeof createMockSupabaseClient>,
  tableName: string,
  response: MockResponse<T>
) {
  const queryBuilder = createQueryBuilder(response);
  mockClient.from.mockImplementation((table: string) => {
    if (table === tableName) {
      return queryBuilder;
    }
    return createQueryBuilder({ data: null, error: null });
  });
  return queryBuilder;
}

/**
 * Helper to set up mock responses for multiple tables
 */
export function mockMultipleTableResponses(
  mockClient: ReturnType<typeof createMockSupabaseClient>,
  responses: Record<string, MockResponse<unknown>>
) {
  mockClient.from.mockImplementation((table: string) => {
    const response = responses[table] || { data: null, error: null };
    return createQueryBuilder(response);
  });
}

/**
 * Creates a mock error response
 */
export function createMockError(message: string, code?: string): MockResponse<null> {
  return {
    data: null,
    error: { message, code },
  };
}

/**
 * Creates a mock success response
 */
export function createMockSuccess<T>(data: T): MockResponse<T> {
  return {
    data,
    error: null,
  };
}

/**
 * Resets all mocks on the client
 */
export function resetMockClient(mockClient: ReturnType<typeof createMockSupabaseClient>) {
  mockClient.from.mockClear();
  mockClient.auth.getUser.mockClear();
  mockClient.storage.from.mockClear();
  mockClient.rpc.mockClear();
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
