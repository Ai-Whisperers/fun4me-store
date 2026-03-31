/**
 * Enhanced Chainable Query Mock for Supabase
 * 
 * This module provides a fully chainable mock that works with all
 * Supabase query builder methods and can be awaited at any point.
 * 
 * Usage:
 *   const mock = createChainableQueryMock([{ id: '1', name: 'Test' }]);
 *   mockSupabase.from.mockReturnValue(mock);
 *   
 *   // Now this works:
 *   const { data } = await supabase.from('table').select().eq('id', '1');
 */

import { vi } from 'vitest';

export interface MockResponse<T = unknown> {
  data: T | null;
  error: { message: string; code?: string; details?: string } | null;
  count?: number | null;
  status?: number;
  statusText?: string;
}

export interface ChainableQueryMock {
  // Query methods
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  
  // Filter methods
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  contains: ReturnType<typeof vi.fn>;
  containedBy: ReturnType<typeof vi.fn>;
  overlaps: ReturnType<typeof vi.fn>;
  textSearch: ReturnType<typeof vi.fn>;
  match: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  filter: ReturnType<typeof vi.fn>;
  
  // Modifier methods
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  offset: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  
  // Terminal methods
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  csv: ReturnType<typeof vi.fn>;
  
  // Promise-like
  then: ReturnType<typeof vi.fn>;
  catch: ReturnType<typeof vi.fn>;
  finally: ReturnType<typeof vi.fn>;
}

/**
 * Creates a chainable query mock that can be used in place of Supabase queries.
 * All methods return the mock itself, allowing chaining, AND the mock is thenable
 * so it can be awaited at any point in the chain.
 */
export function createChainableQueryMock<T = unknown>(
  data: T | T[] | null,
  error: { message: string; code?: string } | null = null,
  options: { count?: number } = {}
): ChainableQueryMock & PromiseLike<MockResponse<T[]>> {
  // Normalize data to array for list queries
  const arrayData = data === null ? null : (Array.isArray(data) ? data : [data]);
  const singleData = data === null ? null : (Array.isArray(data) ? data[0] : data);
  
  const response: MockResponse<T[]> = {
    data: arrayData as T[] | null,
    error,
    count: options.count ?? (arrayData?.length ?? null),
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
  };
  
  const singleResponse: MockResponse<T> = {
    data: singleData as T | null,
    error,
    count: 1,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
  };

  // Create the mock object
  const mock: any = {};
  
  // All chainable methods
  const chainableMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'is', 'in',
    'contains', 'containedBy', 'overlaps', 'textSearch',
    'match', 'not', 'or', 'filter',
    'order', 'limit', 'offset', 'range',
  ];
  
  // Create chainable methods that return the mock
  chainableMethods.forEach(method => {
    mock[method] = vi.fn().mockReturnValue(mock);
  });
  
  // Terminal methods that return final results
  mock.single = vi.fn().mockResolvedValue(singleResponse);
  mock.maybeSingle = vi.fn().mockResolvedValue(singleResponse);
  mock.csv = vi.fn().mockResolvedValue({ data: '', error: null });
  
  // Make the mock thenable (can be awaited)
  mock.then = vi.fn((onFulfilled?: (value: MockResponse<T[]>) => any, onRejected?: (reason: any) => any) => {
    return Promise.resolve(response).then(onFulfilled, onRejected);
  });
  
  mock.catch = vi.fn((onRejected?: (reason: any) => any) => {
    return Promise.resolve(response).catch(onRejected);
  });
  
  mock.finally = vi.fn((onFinally?: () => void) => {
    return Promise.resolve(response).finally(onFinally);
  });
  
  return mock as ChainableQueryMock & PromiseLike<MockResponse<T[]>>;
}

/**
 * Creates a mock that returns successful data
 */
export function createSuccessMock<T>(data: T | T[]) {
  return createChainableQueryMock(data, null);
}

/**
 * Creates a mock that returns an error
 */
export function createErrorMock(message: string, code?: string) {
  return createChainableQueryMock(null, { message, code });
}

/**
 * Creates a mock that returns empty results
 */
export function createEmptyMock() {
  return createChainableQueryMock([], null);
}

/**
 * Creates a mock that returns a single item (for .single() calls)
 */
export function createSingleMock<T>(data: T | null, error: { message: string; code?: string } | null = null) {
  return createChainableQueryMock(data, error);
}

/**
 * Creates a mock for RPC calls
 */
export function createRpcMock<T>(data: T | null, error: { message: string; code?: string } | null = null) {
  return vi.fn().mockResolvedValue({ data, error });
}

/**
 * Mock implementation helper for .from() that routes to different mocks by table
 */
export function createTableRouter(tables: Record<string, ChainableQueryMock>) {
  return vi.fn((tableName: string) => {
    return tables[tableName] || createEmptyMock();
  });
}

export default {
  createChainableQueryMock,
  createSuccessMock,
  createErrorMock,
  createEmptyMock,
  createSingleMock,
  createRpcMock,
  createTableRouter,
};
