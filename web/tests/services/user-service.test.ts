/**
 * UserService Tests
 *
 * Comprehensive tests for user/profile management:
 * - Profile CRUD operations
 * - Role management
 * - User search and filtering
 * - Staff management
 * - Statistics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService, type UserProfile, type UserRole } from '@/lib/services/user-service';
import {
  createMockSupabaseClient,
  createMockSuccess,
  createMockError,
  type MockSupabaseClient,
} from './__mocks__/supabase-mock';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// =============================================================================
// CHAINABLE MOCK HELPER
// =============================================================================

/**
 * Creates a chainable query builder mock that supports thenable chaining.
 * This is necessary because Supabase queries can have filters applied AFTER order().
 *
 * @param response - The mock response to return when the query is awaited
 * @returns A mock object that supports method chaining and can be awaited
 */
function createChainableMock<T>(response: { data: T | null; error: { message: string; code?: string } | null }) {
  const mockObj: Record<string, unknown> = {};

  // All methods return `this` for chaining
  const chainMethods = ['select', 'eq', 'is', 'in', 'not', 'or', 'ilike', 'order', 'limit', 'range', 'gte', 'lte', 'gt', 'lt', 'neq'];
  chainMethods.forEach(method => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });

  // Terminal methods return the response
  mockObj.single = vi.fn().mockResolvedValue(response);
  mockObj.maybeSingle = vi.fn().mockResolvedValue(response);

  // Make the object thenable so it can be awaited
  mockObj.then = vi.fn().mockImplementation((resolve: (value: typeof response) => void) => {
    return Promise.resolve(response).then(resolve);
  });

  return mockObj;
}

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

function createMockUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-123',
    tenant_id: 'tenant-abc',
    full_name: 'Juan Pérez',
    email: 'juan@example.com',
    phone: '+595981234567',
    secondary_phone: null,
    avatar_url: null,
    role: 'owner' as UserRole,
    client_code: 'CLI-001',
    address: 'Av. España 1234',
    city: 'Asunción',
    document_type: 'CI',
    document_number: '1234567',
    preferred_contact: 'whatsapp',
    notes: null,
    signature_url: null,
    license_number: null,
    specializations: null,
    bio: null,
    deleted_at: null,
    deleted_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockVet(overrides: Partial<UserProfile> = {}): UserProfile {
  return createMockUser({
    id: 'vet-456',
    full_name: 'Dr. María González',
    email: 'maria@clinic.com',
    role: 'vet',
    license_number: 'VET-12345',
    specializations: ['Cirugía', 'Dermatología'],
    bio: 'Veterinaria con 10 años de experiencia',
    client_code: null,
    ...overrides,
  });
}

function createMockAdmin(overrides: Partial<UserProfile> = {}): UserProfile {
  return createMockUser({
    id: 'admin-789',
    full_name: 'Admin User',
    email: 'admin@clinic.com',
    role: 'admin',
    ...overrides,
  });
}

// =============================================================================
// TESTS
// =============================================================================

describe('UserService', () => {
  let mockClient: MockSupabaseClient;
  let service: UserService;
  const TENANT_ID = 'tenant-abc';

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new UserService(mockClient as never);
    vi.clearAllMocks();
  });

  // ===========================================================================
  // list() Tests
  // ===========================================================================

  describe('list', () => {
    it('should return all users for a tenant', async () => {
      const mockUsers = [createMockUser(), createMockVet(), createMockAdmin()];
      mockClient.from.mockReturnValue(createChainableMock(createMockSuccess(mockUsers)));

      const result = await service.list(TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0].full_name).toBe('Juan Pérez');
      }
    });

    it('should filter by role', async () => {
      const mockVets = [createMockVet()];
      mockClient.from.mockReturnValue(createChainableMock(createMockSuccess(mockVets)));

      const result = await service.list(TENANT_ID, { role: 'vet' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].role).toBe('vet');
      }
    });

    it('should filter staff (vets and admins)', async () => {
      const mockStaff = [createMockVet(), createMockAdmin()];
      mockClient.from.mockReturnValue(createChainableMock(createMockSuccess(mockStaff)));

      const result = await service.list(TENANT_ID, { is_staff: true });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every(u => ['vet', 'admin'].includes(u.role))).toBe(true);
      }
    });

    it('should filter by city', async () => {
      const mockUsers = [createMockUser({ city: 'Encarnación' })];
      mockClient.from.mockReturnValue(createChainableMock(createMockSuccess(mockUsers)));

      const result = await service.list(TENANT_ID, { city: 'Encarnación' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].city).toBe('Encarnación');
      }
    });

    it('should filter by search term', async () => {
      const mockUsers = [createMockUser({ full_name: 'Juan Pérez' })];
      mockClient.from.mockReturnValue(createChainableMock(createMockSuccess(mockUsers)));

      const result = await service.list(TENANT_ID, { search: 'Juan' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
      }
    });

    it('should filter users with phone', async () => {
      const mockUsers = [createMockUser()];
      mockClient.from.mockReturnValue(createChainableMock(createMockSuccess(mockUsers)));

      const result = await service.list(TENANT_ID, { has_phone: true });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].phone).toBeTruthy();
      }
    });

    it('should return empty array when no users found', async () => {
      mockClient.from.mockReturnValue(createChainableMock(createMockSuccess([])));

      const result = await service.list(TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it('should handle database errors', async () => {
      mockClient.from.mockReturnValue(createChainableMock(createMockError('Connection failed')));

      const result = await service.list(TENANT_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service returns specific error message from database
        expect(result.error).toBe('Connection failed');
      }
    });
  });

  // ===========================================================================
  // getById() Tests
  // ===========================================================================

  describe('getById', () => {
    it('should return user by ID', async () => {
      const mockUser = createMockUser();

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(mockUser)),
      });

      const result = await service.getById('user-123', TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('user-123');
        expect(result.data.full_name).toBe('Juan Pérez');
      }
    });

    it('should return error when user not found', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(null)),
      });

      const result = await service.getById('nonexistent', TENANT_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service throws specific error when user not found
        expect(result.error).toBe('User not found');
      }
    });

    it('should handle database errors', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockError('Connection failed')),
      });

      const result = await service.getById('user-123', TENANT_ID);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // getByEmail() Tests
  // ===========================================================================

  describe('getByEmail', () => {
    it('should return user by email', async () => {
      const mockUser = createMockUser();

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(mockUser)),
      });

      const result = await service.getByEmail('juan@example.com', TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.email).toBe('juan@example.com');
      }
    });

    it('should return null when user not found', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockError('Not found', 'PGRST116')),
      });

      const result = await service.getByEmail('nonexistent@example.com', TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  // ===========================================================================
  // create() Tests
  // ===========================================================================

  describe('create', () => {
    it('should create new user successfully', async () => {
      const newUser = createMockUser({ id: 'new-user-id' });

      // Mock getByEmail to return null (no existing user)
      const mockGetByEmail = vi.fn().mockResolvedValue(
        createMockError('Not found', 'PGRST116')
      );

      // Mock insert
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue(createMockSuccess(newUser));

      mockClient.from.mockReturnValue({
        select: mockGetByEmail,
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: mockGetByEmail,
        insert: mockInsert,
      });

      // Override for the sequence
      mockClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockError('Not found', 'PGRST116')),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(createMockSuccess(newUser)),
          }),
        }),
      }));

      const result = await service.create(TENANT_ID, {
        full_name: 'Nuevo Usuario',
        email: 'nuevo@example.com',
        role: 'owner',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.full_name).toBe('Juan Pérez');
      }
    });

    it('should reject duplicate email in same tenant', async () => {
      const existingUser = createMockUser();

      // Mock getByEmail to return existing user
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(existingUser)),
      });

      const result = await service.create(TENANT_ID, {
        full_name: 'Duplicate User',
        email: 'juan@example.com', // Same as existing
        role: 'owner',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service throws specific error for duplicate email
        expect(result.error).toBe('User with this email already exists in this tenant');
      }
    });
  });

  // ===========================================================================
  // update() Tests
  // ===========================================================================

  describe('update', () => {
    it('should update user successfully', async () => {
      const updatedUser = createMockUser({ full_name: 'Juan Actualizado' });

      mockClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(updatedUser)),
      });

      const result = await service.update('user-123', TENANT_ID, {
        full_name: 'Juan Actualizado',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.full_name).toBe('Juan Actualizado');
      }
    });

    it('should return error when user not found', async () => {
      mockClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(null)),
      });

      const result = await service.update('nonexistent', TENANT_ID, {
        full_name: 'New Name',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // updateRole() Tests
  // ===========================================================================

  describe('updateRole', () => {
    it('should update user role to vet', async () => {
      const updatedUser = createMockUser({ role: 'vet' });

      mockClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(updatedUser)),
      });

      const result = await service.updateRole('user-123', TENANT_ID, 'vet');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('vet');
      }
    });

    it('should update user role to admin', async () => {
      const updatedUser = createMockUser({ role: 'admin' });

      mockClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(updatedUser)),
      });

      const result = await service.updateRole('user-123', TENANT_ID, 'admin');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('admin');
      }
    });
  });

  // ===========================================================================
  // delete() Tests
  // ===========================================================================

  describe('delete', () => {
    it('should soft delete user successfully', async () => {
      mockClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(null)),
      });

      const result = await service.delete('user-123', TENANT_ID, 'admin-789');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should handle deletion errors', async () => {
      // The delete method uses update().eq().eq().is() without single()
      // So the error should be returned from .is()
      mockClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: { message: 'Foreign key violation', code: '23503' } }),
      });

      const result = await service.delete('user-123', TENANT_ID, 'admin-789');

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // Staff Management Tests
  // ===========================================================================

  describe('listStaff', () => {
    it('should return only staff members', async () => {
      const mockStaff = [createMockVet(), createMockAdmin()];
      mockClient.from.mockReturnValue(createChainableMock(createMockSuccess(mockStaff)));

      const result = await service.listStaff(TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });
  });

  describe('listVets', () => {
    it('should return only veterinarians', async () => {
      const mockVets = [createMockVet()];
      mockClient.from.mockReturnValue(createChainableMock(createMockSuccess(mockVets)));

      const result = await service.listVets(TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].role).toBe('vet');
      }
    });
  });

  describe('listAdmins', () => {
    it('should return only admins', async () => {
      const mockAdmins = [createMockAdmin()];
      mockClient.from.mockReturnValue(createChainableMock(createMockSuccess(mockAdmins)));

      const result = await service.listAdmins(TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].role).toBe('admin');
      }
    });
  });

  describe('listOwners', () => {
    it('should return only owners/clients', async () => {
      const mockOwners = [createMockUser()];
      mockClient.from.mockReturnValue(createChainableMock(createMockSuccess(mockOwners)));

      const result = await service.listOwners(TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].role).toBe('owner');
      }
    });
  });

  // ===========================================================================
  // Search & Utilities Tests
  // ===========================================================================

  describe('search', () => {
    it('should search users by term', async () => {
      const mockResults = [createMockUser({ full_name: 'Juan Pérez' })];
      mockClient.from.mockReturnValue(createChainableMock(createMockSuccess(mockResults)));

      const result = await service.search(TENANT_ID, 'Juan');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
      }
    });

    it('should return empty array for no matches', async () => {
      mockClient.from.mockReturnValue(createChainableMock(createMockSuccess([])));

      const result = await service.search(TENANT_ID, 'NonexistentName');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });
  });

  describe('getStats', () => {
    it('should return correct user statistics', async () => {
      const mockUsers = [
        createMockUser({ role: 'owner', phone: '+595981234567' }),
        createMockUser({ id: 'user-2', role: 'owner', phone: null }),
        createMockVet({ phone: '+595987654321' }),
        createMockAdmin({ phone: '+595912345678' }),
      ];

      // getStats uses a direct query (select with count) that is awaited
      mockClient.from.mockReturnValue(createChainableMock(createMockSuccess(mockUsers)));

      const result = await service.getStats(TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total).toBe(4);
        expect(result.data.owners).toBe(2);
        expect(result.data.vets).toBe(1);
        expect(result.data.admins).toBe(1);
        expect(result.data.withPhone).toBe(3);
      }
    });

    it('should handle empty tenant', async () => {
      mockClient.from.mockReturnValue(createChainableMock(createMockSuccess([])));

      const result = await service.getStats(TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total).toBe(0);
        expect(result.data.owners).toBe(0);
        expect(result.data.vets).toBe(0);
        expect(result.data.admins).toBe(0);
        expect(result.data.withPhone).toBe(0);
      }
    });
  });
});
