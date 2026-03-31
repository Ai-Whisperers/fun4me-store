/**
 * PetService Tests
 *
 * Comprehensive tests for pet management:
 * - Pet CRUD operations
 * - Owner access control
 * - Staff access
 * - Photo upload
 * - Tenant validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PetService, type CreatePetData, type UpdatePetData } from '@/lib/services/pet-service';
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

// Mock the audit module
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

interface MockPet {
  id: string;
  owner_id: string;
  tenant_id: string;
  name: string;
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
  breed: string | null;
  birth_date: string | null;
  weight_kg: number | null;
  sex: 'male' | 'female' | null;
  color: string | null;
  is_neutered: boolean | null;
  photo_url: string | null;
  microchip_number: string | null;
  temperament: string | null;
  diet_category: string | null;
  diet_notes: string | null;
  allergies: string[] | null;
  chronic_conditions: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function createMockPet(overrides: Partial<MockPet> = {}): MockPet {
  return {
    id: 'pet-123',
    owner_id: 'owner-456',
    tenant_id: 'tenant-abc',
    name: 'Max',
    species: 'dog',
    breed: 'Labrador',
    birth_date: '2022-03-15',
    weight_kg: 25.5,
    sex: 'male',
    color: 'Golden',
    is_neutered: true,
    photo_url: 'https://example.com/max.jpg',
    microchip_number: 'CHIP-12345',
    temperament: 'friendly',
    diet_category: 'premium',
    diet_notes: null,
    allergies: ['chicken'],
    chronic_conditions: null,
    notes: 'Very friendly dog',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

function createMockPetWithOwner(overrides: Partial<MockPet> = {}) {
  return {
    ...createMockPet(overrides),
    owner: {
      id: 'owner-456',
      full_name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '+595981234567',
    },
  };
}

/**
 * Creates a properly chainable mock for Supabase queries.
 * All methods return `this` for chaining, and the query resolves when awaited.
 */
function createChainableQueryMock<T>(response: { data: T | null; error: { message: string } | null }) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(response),
    maybeSingle: vi.fn().mockResolvedValue(response),
    // Make the mock thenable so it resolves when awaited
    then: (resolve: (value: typeof response) => void) => resolve(response),
  };
  return mock;
}

// =============================================================================
// TESTS
// =============================================================================

describe('PetService', () => {
  let mockClient: MockSupabaseClient;
  let service: PetService;
  const TENANT_ID = 'tenant-abc';
  const OWNER_ID = 'owner-456';

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new PetService(mockClient as never);
    vi.clearAllMocks();
  });

  // ===========================================================================
  // list() Tests
  // ===========================================================================

  describe('list', () => {
    it('should return pets for an owner', async () => {
      const mockPets = [createMockPet(), createMockPet({ id: 'pet-456', name: 'Luna' })];

      // Create properly chainable mock that resolves when awaited
      const chainableMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: (value: unknown) => void) => resolve(createMockSuccess(mockPets)),
      };
      mockClient.from.mockReturnValue(chainableMock);

      const result = await service.list(OWNER_ID, TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].name).toBe('Max');
        expect(result.data[1].name).toBe('Luna');
      }
    });

    it('should filter by name query', async () => {
      const mockPets = [createMockPet({ name: 'Max' })];

      const chainableMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: (value: unknown) => void) => resolve(createMockSuccess(mockPets)),
      };
      mockClient.from.mockReturnValue(chainableMock);

      const result = await service.list(OWNER_ID, TENANT_ID, { query: 'Max' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('Max');
      }
    });

    it('should filter by species', async () => {
      const mockPets = [createMockPet({ species: 'cat', name: 'Michi' })];

      mockClient.from.mockReturnValue(createChainableQueryMock(createMockSuccess(mockPets)));

      const result = await service.list(OWNER_ID, TENANT_ID, { species: 'cat' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].species).toBe('cat');
      }
    });

    it('should exclude deleted pets by default', async () => {
      const mockPets = [createMockPet()]; // Only non-deleted

      mockClient.from.mockReturnValue(createChainableQueryMock(createMockSuccess(mockPets)));

      const result = await service.list(OWNER_ID, TENANT_ID, { includeDeleted: false });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].deleted_at).toBeNull();
      }
    });

    it('should include deleted pets for staff when requested', async () => {
      const mockPets = [
        createMockPet(),
        createMockPet({ id: 'pet-deleted', deleted_at: '2026-01-10T00:00:00Z' }),
      ];

      mockClient.from.mockReturnValue(createChainableQueryMock(createMockSuccess(mockPets)));

      const result = await service.list(OWNER_ID, TENANT_ID, { includeDeleted: true }, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    it('should return empty array when owner has no pets', async () => {
      mockClient.from.mockReturnValue(createChainableQueryMock(createMockSuccess([])));

      const result = await service.list(OWNER_ID, TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it('should handle database errors', async () => {
      mockClient.from.mockReturnValue(createChainableQueryMock(createMockError('Connection failed')));

      const result = await service.list(OWNER_ID, TENANT_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service returns specific error message
        expect(result.error).toBe('Connection failed');
      }
    });
  });

  // ===========================================================================
  // getById() Tests
  // ===========================================================================

  describe('getById', () => {
    it('should return pet by ID for owner', async () => {
      const mockPet = createMockPet();

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(mockPet)),
      });

      const result = await service.getById('pet-123', OWNER_ID, TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('pet-123');
        expect(result.data.name).toBe('Max');
      }
    });

    it('should return pet for staff from same tenant', async () => {
      const mockPet = createMockPet();

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(mockPet)),
      });

      const result = await service.getById('pet-123', 'staff-789', TENANT_ID, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('pet-123');
      }
    });

    it('should reject access for non-owner non-staff', async () => {
      const mockPet = createMockPet({ owner_id: 'different-owner' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(mockPet)),
      });

      const result = await service.getById('pet-123', 'wrong-owner', TENANT_ID, false);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service returns specific permission error
        expect(result.error).toContain('No tiene permisos');
      }
    });

    it('should reject staff from different tenant', async () => {
      const mockPet = createMockPet({ tenant_id: 'different-tenant' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(mockPet)),
      });

      const result = await service.getById('pet-123', 'staff-789', TENANT_ID, true);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service uses standardized Spanish error message
        expect(result.error).toBe('No puede acceder a datos de otra clínica.');
      }
    });

    it('should return error when pet not found', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockError('Not found', 'PGRST116')),
      });

      const result = await service.getById('nonexistent', OWNER_ID, TENANT_ID);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // create() Tests
  // ===========================================================================

  describe('create', () => {
    it('should create pet with minimal data', async () => {
      const newPet = createMockPet({ id: 'new-pet-id' });

      mockClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(createMockSuccess(newPet)),
          }),
        }),
      });

      const createData: CreatePetData = {
        name: 'Max',
        species: 'dog',
      };

      const result = await service.create(OWNER_ID, TENANT_ID, createData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Max');
        expect(result.data.species).toBe('dog');
      }
    });

    it('should create pet with full data', async () => {
      const newPet = createMockPet({
        id: 'new-pet-id',
        name: 'Luna',
        species: 'cat',
        breed: 'Siamese',
        birth_date: '2023-06-15',
        weight_kg: 4.5,
        sex: 'female',
        color: 'Cream',
        is_neutered: true,
      });

      mockClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(createMockSuccess(newPet)),
          }),
        }),
      });

      const createData: CreatePetData = {
        name: 'Luna',
        species: 'cat',
        breed: 'Siamese',
        birth_date: '2023-06-15',
        weight_kg: 4.5,
        sex: 'female',
        color: 'Cream',
        is_neutered: true,
      };

      const result = await service.create(OWNER_ID, TENANT_ID, createData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Luna');
        expect(result.data.species).toBe('cat');
        expect(result.data.breed).toBe('Siamese');
      }
    });

    it('should reject creation without name', async () => {
      const createData = {
        name: '',
        species: 'dog' as const,
      };

      const result = await service.create(OWNER_ID, TENANT_ID, createData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.message).toContain('Campos requeridos faltantes');
      }
    });

    it('should reject creation without species', async () => {
      const createData = {
        name: 'Max',
        species: '' as never,
      };

      const result = await service.create(OWNER_ID, TENANT_ID, createData);

      expect(result.success).toBe(false);
    });

    it('should handle database errors', async () => {
      mockClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(createMockError('Insert failed')),
          }),
        }),
      });

      const createData: CreatePetData = {
        name: 'Max',
        species: 'dog',
      };

      const result = await service.create(OWNER_ID, TENANT_ID, createData);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // update() Tests
  // ===========================================================================

  describe('update', () => {
    it('should update pet for owner', async () => {
      const existingPet = createMockPet();
      const updatedPet = createMockPet({ name: 'Maxi', weight_kg: 27 });

      mockClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(existingPet)),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(createMockSuccess(updatedPet)),
            }),
          }),
        }),
      }));

      const updates: UpdatePetData = {
        name: 'Maxi',
        weight_kg: 27,
      };

      const result = await service.update('pet-123', OWNER_ID, TENANT_ID, updates);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Maxi');
        expect(result.data.weight_kg).toBe(27);
      }
    });

    it('should update pet for staff from same tenant', async () => {
      const existingPet = createMockPet();
      const updatedPet = createMockPet({ notes: 'Updated by staff' });

      mockClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(existingPet)),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(createMockSuccess(updatedPet)),
            }),
          }),
        }),
      }));

      const updates: UpdatePetData = {
        notes: 'Updated by staff',
      };

      const result = await service.update('pet-123', 'staff-789', TENANT_ID, updates, true);

      expect(result.success).toBe(true);
    });

    it('should reject update for non-owner non-staff', async () => {
      const existingPet = createMockPet({ owner_id: 'different-owner' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(existingPet)),
      });

      const updates: UpdatePetData = { name: 'Hacked' };

      const result = await service.update('pet-123', 'wrong-owner', TENANT_ID, updates);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.message).toContain('No tiene permisos');
      }
    });

    it('should return error when pet not found', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(null)),
      });

      const result = await service.update('nonexistent', OWNER_ID, TENANT_ID, { name: 'New' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.message).toContain('Mascota no encontrada');
      }
    });
  });

  // ===========================================================================
  // delete() Tests
  // ===========================================================================

  describe('delete', () => {
    it('should soft delete pet for owner', async () => {
      const existingPet = createMockPet();

      mockClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(existingPet)),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(createMockSuccess(null)),
        }),
      }));

      const result = await service.delete('pet-123', OWNER_ID, TENANT_ID);

      expect(result.success).toBe(true);
    });

    it('should soft delete pet for staff from same tenant', async () => {
      const existingPet = createMockPet();

      mockClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(existingPet)),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(createMockSuccess(null)),
        }),
      }));

      const result = await service.delete('pet-123', 'staff-789', TENANT_ID, true);

      expect(result.success).toBe(true);
    });

    it('should reject deletion for non-owner non-staff', async () => {
      const existingPet = createMockPet({ owner_id: 'different-owner' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(existingPet)),
      });

      const result = await service.delete('pet-123', 'wrong-owner', TENANT_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.message).toContain('No tiene permisos');
      }
    });

    it('should return error when pet not found', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(null)),
      });

      const result = await service.delete('nonexistent', OWNER_ID, TENANT_ID);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // uploadPhoto() Tests
  // ===========================================================================

  describe('uploadPhoto', () => {
    it('should upload photo for owned pet', async () => {
      const existingPet = createMockPet();
      const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(existingPet)),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(createMockSuccess(null)),
        }),
      });

      mockClient.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/new-photo.jpg' } }),
      });

      const result = await service.uploadPhoto('pet-123', OWNER_ID, mockFile);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('https://example.com/new-photo.jpg');
      }
    });

    it('should reject photo upload for non-owned pet', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(null)),
      });

      const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });

      const result = await service.uploadPhoto('pet-123', 'wrong-owner', mockFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.message).toContain('no encontrada o no tiene permisos');
      }
    });

    it('should handle storage upload errors', async () => {
      const existingPet = createMockPet();
      const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSuccess(existingPet)),
      });

      mockClient.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: { message: 'Upload failed' } }),
        getPublicUrl: vi.fn(),
      });

      const result = await service.uploadPhoto('pet-123', OWNER_ID, mockFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.message).toContain('Error al subir foto');
      }
    });
  });

  // ===========================================================================
  // listWithOwners() Tests
  // ===========================================================================

  describe('listWithOwners', () => {
    it('should return pets with owner information', async () => {
      const mockPetsWithOwners = [createMockPetWithOwner(), createMockPetWithOwner({ id: 'pet-456', name: 'Luna' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(createMockSuccess(mockPetsWithOwners)),
      });

      const result = await service.listWithOwners(TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]).toHaveProperty('owner');
      }
    });

    it('should filter by query', async () => {
      const mockPetsWithOwners = [createMockPetWithOwner()];

      mockClient.from.mockReturnValue(createChainableQueryMock(createMockSuccess(mockPetsWithOwners)));

      const result = await service.listWithOwners(TENANT_ID, { query: 'Max' });

      expect(result.success).toBe(true);
    });

    it('should filter by species', async () => {
      const mockPetsWithOwners = [createMockPetWithOwner({ species: 'cat' })];

      mockClient.from.mockReturnValue(createChainableQueryMock(createMockSuccess(mockPetsWithOwners)));

      const result = await service.listWithOwners(TENANT_ID, { species: 'cat' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].species).toBe('cat');
      }
    });

    it('should handle database errors', async () => {
      mockClient.from.mockReturnValue(createChainableQueryMock(createMockError('Connection failed')));

      const result = await service.listWithOwners(TENANT_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service returns specific error message
        expect(result.error).toBe('Connection failed');
      }
    });
  });
});
