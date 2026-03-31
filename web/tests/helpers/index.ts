/**
 * Test Helpers Index
 * 
 * Re-exports all test utilities for easy importing:
 * 
 * import { createChainableQueryMock, mockAuthenticatedUser } from '@/tests/helpers';
 */

// Query mocks
export {
  createChainableQueryMock,
  createSuccessMock,
  createErrorMock,
  createEmptyMock,
  createSingleMock,
  createRpcMock,
  createTableRouter,
  type MockResponse,
  type ChainableQueryMock,
} from './query-mock';

// Auth mocks
export {
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
  type TestUser,
} from './auth-mock';
