/**
 * Test Utilities - Unified API
 *
 * This module provides a comprehensive testing infrastructure:
 * - Factories: Builder-pattern factories for creating test data
 * - Mocks: Stateful Supabase mocks with auth scenarios
 * - Fixtures: Consolidated test fixtures (TENANTS, USERS, PETS, etc.)
 * - Cleanup: Resource tracking and cleanup management
 * - Auth Tests: Authorization test generators
 *
 * @example
 * ```typescript
 * import {
 *   // Factories
 *   factories, factoryMode, idGenerator,
 *   // Mocks
 *   mockState, AUTH_SCENARIOS, createStatefulSupabaseMock,
 *   // Fixtures
 *   TENANTS, USERS, PETS, INVOICES,
 *   // Auth tests
 *   testStaffOnlyEndpoint, testAdminOnlyEndpoint,
 *   // Cleanup
 *   cleanupManager,
 * } from '@/lib/test-utils';
 * ```
 */

// =============================================================================
// Legacy Factories (backward compatible)
// =============================================================================

// Legacy factories moved to factories/ directory
// export * from './factories'
export * from './supabase-mock'

// Explicit exports from factories.ts that might be shadowed

// =============================================================================
// New Builder-Pattern Factories (includes core infrastructure)
// =============================================================================

export * from './factories/index'

// =============================================================================
// Mock Presets - Stateful Supabase mocking
// =============================================================================

export {
  // Types
  type MockUser,
  type MockProfile,
  type AuthScenario,
  type MockSupabaseClient,
  type MockApiHandlerContext,
  type MockApiHandlerContextWithParams,
  // Default mock data
  DEFAULT_MOCK_USER,
  DEFAULT_MOCK_VET_PROFILE,
  DEFAULT_MOCK_ADMIN_PROFILE,
  DEFAULT_MOCK_OWNER_PROFILE,
  // Auth scenarios
  AUTH_SCENARIOS,
  // MockState singleton
  mockState,
  // Supabase mock factory
  createStatefulSupabaseMock,
  getSupabaseServerMock,
  // Auth module mock
  getAuthMock,
  // Features mock (for @/lib/features/server)
  getFeaturesMock,
  // Mock helper factories (for use inside vi.mock with dynamic imports)
  createMockLogger,
  createMockPerfTracker,
  createMockScopedQueries,
  // Convenience functions
  resetMockState,
  setupApiTestMocks,
  // Service mocks
  mockEmailService,
  mockSmsService,
  mockWhatsAppService,
  mockStorageService,
  mockCronJob,
  // Service mock getters (for vi.mock)
  getEmailMock,
  getSmsMock,
  getWhatsAppMock,
  getStorageMock,
  getCronAuthMock,
  // Global reset
  resetAllMocks,
} from './mock-presets'

// =============================================================================
// Request Helpers - Create typed NextRequest objects for tests
// =============================================================================

export {
  // Types
  type RequestOptions,
  type RouteHandler,
  type RouteHandlerWithParams,
  // Main helper
  createNextRequest,
  createJsonRequest,
  // Route handler wrappers (for calling handlers with Request objects)
  callRoute,
  callRouteWithParams,
  // Convenience helpers
  createGetRequest,
  createPostRequest,
  createPutRequest,
  createPatchRequest,
  createDeleteRequest,
  createCronRequest,
  createFormDataRequest,
  createRouteContext,
} from './request-helpers'

// =============================================================================
// Authorization Test Suite - Test generators
// =============================================================================

export {
  // Types
  type Role,
  type AuthTestConfig,
  // Main test generator
  testAuthorizationScenarios,
  // Convenience wrappers
  testStaffOnlyEndpoint,
  testAdminOnlyEndpoint,
  testAuthenticatedEndpoint,
  testOwnerOnlyEndpoint,
  // Individual test helpers
  testAuthScenario,
  expectUnauthorized,
  expectForbidden,
} from './auth-test-suite'

// =============================================================================
// Consolidated Fixtures
// =============================================================================

export {
  // Types
  type TenantFixture,
  type TenantId,
  type UserFixture,
  type UserRole,
  type ProfileFixture,
  type PetFixture,
  type InvoiceFixture,
  type InvoiceStatus,
  type HospitalizationFixture,
  type HospitalizationStatus,
  type AcuityLevel,
  type KennelFixture,
  type KennelStatus,
  type ServiceFixture,
  // New fixture types
  type VaccineFixture,
  type VaccineReactionFixture,
  type ReactionSeverity,
  type ReactionType,
  type PrescriptionFixture,
  type PrescriptionStatus,
  type AppointmentFixture,
  type AppointmentStatus,
  type ConversationFixture,
  type ConversationStatus,
  type ConversationChannel,
  type MessageFixture,
  type MessageStatus,
  type SenderType,
  type ReminderFixture,
  type ReminderType,
  type ReminderStatus,
  type ReminderChannel,
  type LabOrderFixture,
  type LabOrderStatus,
  type ConsentDocumentFixture,
  type InsuranceClaimFixture,
  type InsuranceClaimStatus,
  type ProcurementOrderFixture,
  type PurchaseOrderStatus,
  type ProductFixture,
  // Fixtures
  TENANTS,
  USERS,
  PETS,
  INVOICES,
  HOSPITALIZATIONS,
  KENNELS,
  SERVICES,
  // New fixtures
  VACCINES,
  VACCINE_REACTIONS,
  PRESCRIPTIONS,
  APPOINTMENTS,
  CONVERSATIONS,
  MESSAGES,
  REMINDERS,
  LAB_ORDERS,
  CONSENT_DOCUMENTS,
  INSURANCE_CLAIMS,
  PROCUREMENT_ORDERS,
  PRODUCTS,
  CRON_SECRETS,
  // Defaults
  DEFAULT_TENANT,
  DEFAULT_OWNER,
  DEFAULT_VET,
  DEFAULT_ADMIN,
  DEFAULT_PET,
  ALL_TENANT_IDS,
  // Invalid credentials for auth failure tests
  INVALID_CREDENTIALS,
  // Helper functions
  tenantUrl,
  toProfile,
  generateTestEmail,
  generateTestPhone,
  getUsersByRole,
  getUsersByTenant,
} from './fixtures'

// =============================================================================
// Test Context (legacy mode and cleanup)
// =============================================================================

export { testContext, setMode, getMode, isTestMode, isSeedMode } from './context'

// =============================================================================
// API Client for seeding
// =============================================================================

export * from './api-client'

// =============================================================================
// Re-export testing library utilities
// =============================================================================

export { render, screen, fireEvent, waitFor } from '@testing-library/react'
export { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// =============================================================================
// Component Test Helpers
// =============================================================================

export {
  // Router mocks
  createMockRouter,
  mockNextNavigation,
  // Context mocks
  createMockCartContext,
  createMockWishlistContext,
  // Form action mocks
  createMockActionState,
  createMockServerAction,
  // Icon mocks
  mockLucideIcons,
  // Render helpers
  renderWithProviders,
  AllProviders,
  // Accessibility helpers
  expectFormAccessibility,
  expectErrorAccessibility,
  // Form helpers
  fillFormInput,
  submitForm,
  // Snapshot helpers
  getStableSnapshot,
  // Mock data factories
  createMockProduct,
  createMockPet,
  createMockAppointment,
  // Types
  type MockRouterOptions,
  type MockCartContextValue,
  type MockWishlistContextValue,
  type CartItem,
  type MockProductListItem,
  type MockPet,
  type MockAppointment,
} from './component-test-helpers'
