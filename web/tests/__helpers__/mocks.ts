import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

export const createMockSupabase = () => {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockEq = vi.fn();
  const mockNeq = vi.fn();
  const mockGt = vi.fn();
  const mockLt = vi.fn();
  const mockGte = vi.fn();
  const mockLte = vi.fn();
  const mockLike = vi.fn();
  const mockIlike = vi.fn();
  const mockIs = vi.fn();
  const mockIn = vi.fn();
  const mockContains = vi.fn();
  const mockNot = vi.fn();
  const mockOr = vi.fn();
  const mockFilter = vi.fn();
  const mockOrder = vi.fn();
  const mockSingle = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockLimit = vi.fn();
  const mockRange = vi.fn();
  const mockUpload = vi.fn();
  const mockGetPublicUrl = vi.fn();
  const mockDownload = vi.fn();
  
  const mockStorage = {
    from: vi.fn().mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
      download: mockDownload,
      list: vi.fn(),
      remove: vi.fn(),
    }),
  };

  // Auth Mocks
  const mockAuth = {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  };

  // Storage for mock data that tests can set
  let mockData = { data: [], error: null };
  let mockDataQueue: any[] = [];
  
  const queryBuilderMock = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    bg: mockEq, // For simpler chaining if needed
    eq: mockEq,
    neq: mockNeq,
    gt: mockGt,
    lt: mockLt,
    gte: mockGte,
    lte: mockLte,
    like: mockLike,
    ilike: mockIlike,
    is: mockIs,
    in: mockIn,
    contains: mockContains,
    containedBy: vi.fn(),
    rangeGt: vi.fn(),
    rangeLt: vi.fn(),
    rangeGte: vi.fn(),
    rangeLte: vi.fn(),
    rangeAdjacent: vi.fn(),
    overlaps: vi.fn(),
    textSearch: vi.fn(),
    match: vi.fn(),
    not: mockNot,
    or: mockOr,
    filter: mockFilter,
    order: mockOrder,
    limit: mockLimit,
    range: mockRange,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    csv: vi.fn(),
    // Method to set mock data for awaited queries
    _setMockData: (data: any) => { mockData = data; },
  };

  // Chain methods properly - all query modifiers return the query builder
  Object.keys(queryBuilderMock).forEach(key => {
    // Skip helper methods that aren't mocks
    if (key === '_setMockData') return;
    // @ts-expect-error - Mock chaining requires dynamic access
    queryBuilderMock[key].mockReturnValue(queryBuilderMock);
  });

  // Specific overrides for terminators or specific behaviors
  mockSelect.mockReturnValue(queryBuilderMock);
  mockInsert.mockReturnValue(queryBuilderMock);
  mockUpdate.mockReturnValue(queryBuilderMock);
  mockDelete.mockReturnValue(queryBuilderMock);
  
  // Terminal methods need to support BOTH chaining AND promise resolution
  // Make the queryBuilder thenable so it can be awaited while still allowing chaining
   
  (queryBuilderMock as any).then = function(resolve: (value: any) => any) {
    // When awaited, use queued data if available, otherwise use mockData
    const dataToUse = mockDataQueue.length > 0 ? mockDataQueue.shift() : mockData;
    return Promise.resolve(dataToUse).then(resolve);
  };
  
  // Override terminal methods to return the thenable queryBuilder for chaining
  mockOrder.mockReturnValue(queryBuilderMock);
  mockSingle.mockReturnValue(queryBuilderMock);
  mockMaybeSingle.mockReturnValue(queryBuilderMock);

  mockFrom.mockReturnValue(queryBuilderMock);
  
  // Make mockRpc thenable and queue-aware (for RPC calls like generate_invoice_number)
  mockRpc.mockImplementation(() => {
    return {
      then: function(resolve: (value: any) => any) {
        const dataToUse = mockDataQueue.length > 0 ? mockDataQueue.shift() : mockData;
        return Promise.resolve(dataToUse).then(resolve);
      }
    };
  });

  return {
    from: mockFrom,
    rpc: mockRpc,
    storage: mockStorage,
    auth: mockAuth,
    _mocks: {
      from: mockFrom,
      rpc: mockRpc,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      neq: mockNeq,
      gt: mockGt,
      lt: mockLt,
      gte: mockGte,
      lte: mockLte,
      like: mockLike,
      ilike: mockIlike,
      is: mockIs,
      in: mockIn,
      contains: mockContains,
      not: mockNot,
      or: mockOr,
      filter: mockFilter,
      order: mockOrder,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      limit: mockLimit,
      range: mockRange,
      storage: mockStorage,
      auth: mockAuth,
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
      queryBuilder: queryBuilderMock,
      setMockData: (data: any) => { mockData = data; },
      queueMockData: (...responses: any[]) => { mockDataQueue = responses; },
      clearQueue: () => { mockDataQueue = []; },
    },
     
  } as unknown as SupabaseClient & { _mocks: any };
};
