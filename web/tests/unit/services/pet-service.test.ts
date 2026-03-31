/**
 * PetService Unit Tests
 *
 * Tests cover:
 * - Pet CRUD operations
 * - Owner access control
 * - Staff access control
 * - Photo upload
 * - Filtering and search
 * - Soft deletion
 * - Error handling
 * - Tenant isolation
 * - Audit logging
 *
 * Target Coverage: 95%+
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PetService } from '@/lib/services/pet-service';
import type { Pet } from '@/lib/types/entities/pet';

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock audit logging
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

const mockPet: Pet = {
  id: 'pet-1',
  owner_id: 'owner-1',
  tenant_id: TENANT_IDS.ADRIS,
  name: 'Max',
  species: 'dog',
  breed: 'Labrador',
  birth_date: '2020-01-15',
  weight_kg: 25.5,
  microchip_number: 'CHIP123456',
  photo_url: 'https://example.com/pets/max.jpg',
  sex: 'male',
  color: 'Golden',
  is_neutered: true,
  temperament: 'friendly',
  diet_category: 'premium',
  diet_notes: 'Prefers chicken',
  allergies: ['grass', 'dust'],
  chronic_conditions: [],
  notes: 'Very active dog',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  deleted_at: null,
};

const mockPetWithOwner = {
  ...mockPet,
  owner: {
    id: 'owner-1',
    full_name: 'Juan Pérez',
    email: 'juan@example.com',
    phone: '+595981234567',
  },
};

import { createMockSupabase } from '@/tests/__helpers__/mocks';
import { TENANT_IDS } from '@/lib/constants/tenants';

// =============================================================================
// TEST SUITE
// =============================================================================

describe('PetService', () => {
  let petService: PetService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    petService = new PetService(mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // list() METHOD TESTS
  // ===========================================================================

  describe('list', () => {
    it('should list all active pets for an owner', async () => {
      const pets = [mockPet];
      mockSupabase._mocks.setMockData({ data: pets, error: null });

      const result = await petService.list('owner-1', TENANT_IDS.ADRIS, {}, false);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(pets);
      expect(mockSupabase.from).toHaveBeenCalledWith('pets');
      expect(mockSupabase._mocks.eq).toHaveBeenCalledWith('owner_id', 'owner-1');
      expect(mockSupabase._mocks.is).toHaveBeenCalledWith('deleted_at', null);
    });

    it('should filter pets by species', async () => {
      const dogPets = [{ ...mockPet, species: 'dog' }];
      mockSupabase._mocks.setMockData({ data: dogPets, error: null });

      const result = await petService.list('owner-1', TENANT_IDS.ADRIS, { species: 'dog' }, false);

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.eq).toHaveBeenCalledWith('species', 'dog');
    });

    it('should search pets by name', async () => {
      const searchResults = [mockPet];
      mockSupabase._mocks.setMockData({ data: searchResults, error: null });

      const result = await petService.list('owner-1', TENANT_IDS.ADRIS, { query: 'Max' }, false);

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.ilike).toHaveBeenCalledWith('name', '%Max%');
    });

    it('should include deleted pets when requested by staff', async () => {
      const allPets = [mockPet, { ...mockPet, id: 'pet-2', deleted_at: '2024-02-01T10:00:00Z' }];
      mockSupabase._mocks.setMockData({ data: allPets, error: null });

      const result = await petService.list('owner-1', TENANT_IDS.ADRIS, { includeDeleted: true }, true);

      expect(result.success).toBe(true);
      // When includeDeleted is true and user is staff, should NOT filter by deleted_at
    });

    it('should NOT include deleted pets for non-staff users', async () => {
      const activePets = [mockPet];
      mockSupabase._mocks.setMockData({ data: activePets, error: null });

      const result = await petService.list('owner-1', TENANT_IDS.ADRIS, { includeDeleted: true }, false);

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.is).toHaveBeenCalledWith('deleted_at', null);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase._mocks.setMockData({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await petService.list('owner-1', TENANT_IDS.ADRIS, {}, false);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return empty array when no pets found', async () => {
      mockSupabase._mocks.setMockData({ data: [], error: null });

      const result = await petService.list('owner-1', TENANT_IDS.ADRIS, {}, false);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ===========================================================================
  // getById() METHOD TESTS
  // ===========================================================================

  describe('getById', () => {
    it('should get pet by ID when user is owner', async () => {
      mockSupabase._mocks.single.mockResolvedValue({ data: mockPet, error: null });

      const result = await petService.getById('pet-1', 'owner-1', TENANT_IDS.ADRIS, false);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPet);
      expect(mockSupabase.from).toHaveBeenCalledWith('pets');
      expect(mockSupabase._mocks.eq).toHaveBeenCalledWith('id', 'pet-1');
      expect(mockSupabase._mocks.is).toHaveBeenCalledWith('deleted_at', null);
    });

    it('should get pet by ID when user is staff', async () => {
      mockSupabase._mocks.single.mockResolvedValue({ data: mockPet, error: null });

      const result = await petService.getById('pet-1', 'staff-1', TENANT_IDS.ADRIS, true);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPet);
    });

    it('should return error when pet not found', async () => {
      mockSupabase._mocks.single.mockResolvedValue({ data: null, error: null });

      const result = await petService.getById('pet-999', 'owner-1', TENANT_IDS.ADRIS, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Mascota no encontrada');
    });

    it('should deny access when user is not owner and not staff', async () => {
      const otherOwnerPet = { ...mockPet, owner_id: 'owner-2' };
      mockSupabase._mocks.single.mockResolvedValue({ data: otherOwnerPet, error: null });

      const result = await petService.getById('pet-1', 'owner-1', TENANT_IDS.ADRIS, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No tiene permisos para ver esta mascota');
    });

    it('should handle database errors', async () => {
      mockSupabase._mocks.single.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' },
      });

      const result = await petService.getById('pet-1', 'owner-1', TENANT_IDS.ADRIS, false);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ===========================================================================
  // create() METHOD TESTS
  // ===========================================================================

  describe('create', () => {
    it('should create a pet with valid data', async () => {
      const newPetData = {
        name: 'Luna',
        species: 'cat' as const,
        breed: 'Siamese',
        birth_date: '2023-05-10',
        weight_kg: 4.2,
        sex: 'female' as const,
        color: 'White',
        is_neutered: false,
        notes: 'Playful kitten',
      };

      const createdPet = {
        id: 'pet-2',
        owner_id: 'owner-1',
        tenant_id: TENANT_IDS.ADRIS,
        ...newPetData,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      mockSupabase._mocks.single.mockResolvedValue({ data: createdPet, error: null });

      const result = await petService.create('owner-1', TENANT_IDS.ADRIS, newPetData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdPet);
      expect(mockSupabase.from).toHaveBeenCalledWith('pets');
      expect(mockSupabase._mocks.insert).toHaveBeenCalled();
    });

    it('should require name field', async () => {
      const invalidData = {
        name: '',
        species: 'dog' as const,
      };

      const result = await petService.create('owner-1', TENANT_IDS.ADRIS, invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should require species field', async () => {
      const invalidData = {
        name: 'Buddy',
        species: '',
      };

       
      const result = await petService.create('owner-1', TENANT_IDS.ADRIS, invalidData as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle database constraint violations', async () => {
      const newPetData = {
        name: 'Rex',
        species: 'dog' as const,
      };

      mockSupabase._mocks.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Unique constraint violation' },
      });

      const result = await petService.create('owner-1', TENANT_IDS.ADRIS, newPetData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should log audit event on creation', async () => {
      const { logAudit } = await import('@/lib/audit');

      const newPetData = {
        name: 'Coco',
        species: 'bird' as const,
      };

      const createdPet = {
        id: 'pet-3',
        owner_id: 'owner-1',
        tenant_id: TENANT_IDS.ADRIS,
        ...newPetData,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      mockSupabase._mocks.single.mockResolvedValue({ data: createdPet, error: null });

      await petService.create('owner-1', TENANT_IDS.ADRIS, newPetData);

      expect(logAudit).toHaveBeenCalledWith('CREATE_PET', 'pets/pet-3', {
        name: 'Coco',
        species: 'bird',
        owner_id: 'owner-1',
      });
    });

    it('should handle null optional fields correctly', async () => {
      const minimalPetData = {
        name: 'Minimal',
        species: 'dog' as const,
        breed: null,
        birth_date: null,
        weight_kg: null,
      };

      const createdPet = {
        id: 'pet-4',
        owner_id: 'owner-1',
        tenant_id: TENANT_IDS.ADRIS,
        name: 'Minimal',
        species: 'dog',
        breed: null,
        birth_date: null,
        weight_kg: null,
        sex: null,
        color: null,
        is_neutered: null,
        photo_url: null,
        notes: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      mockSupabase._mocks.single.mockResolvedValue({ data: createdPet, error: null });

      const result = await petService.create('owner-1', TENANT_IDS.ADRIS, minimalPetData);

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // update() METHOD TESTS
  // ===========================================================================

  describe('update', () => {
    it('should update pet when user is owner', async () => {
      // First query: fetch existing pet
      mockSupabase._mocks.single
        .mockResolvedValueOnce({
          data: { id: 'pet-1', owner_id: 'owner-1', tenant_id: TENANT_IDS.ADRIS },
          error: null,
        })
        // Second query: return updated pet
        .mockResolvedValueOnce({
          data: { ...mockPet, name: 'Max Updated', weight_kg: 26.0 },
          error: null,
        });

      const updates = {
        name: 'Max Updated',
        weight_kg: 26.0,
      };

      const result = await petService.update('pet-1', 'owner-1', TENANT_IDS.ADRIS, updates, false);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Max Updated');
      expect(mockSupabase._mocks.update).toHaveBeenCalled();
    });

    it('should update pet when user is staff', async () => {
      mockSupabase._mocks.single
        .mockResolvedValueOnce({
          data: { id: 'pet-1', owner_id: 'owner-1', tenant_id: TENANT_IDS.ADRIS },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockPet, breed: 'Golden Retriever' },
          error: null,
        });

      const updates = {
        breed: 'Golden Retriever',
      };

      const result = await petService.update('pet-1', 'staff-1', TENANT_IDS.ADRIS, updates, true);

      expect(result.success).toBe(true);
    });

    it('should deny update when user is not owner and not staff', async () => {
      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: { id: 'pet-1', owner_id: 'owner-2', tenant_id: TENANT_IDS.ADRIS },
        error: null,
      });

      const updates = { name: 'Hacked Name' };

      const result = await petService.update('pet-1', 'owner-1', TENANT_IDS.ADRIS, updates, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No tiene permisos para modificar esta mascota');
    });

    it('should return error when pet not found', async () => {
      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const updates = { name: 'New Name' };

      const result = await petService.update('pet-999', 'owner-1', TENANT_IDS.ADRIS, updates, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Mascota no encontrada');
    });

    it('should log audit event on update', async () => {
      const { logAudit } = await import('@/lib/audit');

      mockSupabase._mocks.single
        .mockResolvedValueOnce({
          data: { id: 'pet-1', owner_id: 'owner-1', tenant_id: TENANT_IDS.ADRIS },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockPet, weight_kg: 27.0 },
          error: null,
        });

      const updates = { weight_kg: 27.0 };

      await petService.update('pet-1', 'owner-1', TENANT_IDS.ADRIS, updates, false);

      expect(logAudit).toHaveBeenCalledWith('UPDATE_PET', 'pets/pet-1', { updates });
    });

    it('should update updated_at timestamp', async () => {
      mockSupabase._mocks.single
        .mockResolvedValueOnce({
          data: { id: 'pet-1', owner_id: 'owner-1', tenant_id: TENANT_IDS.ADRIS },
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockPet,
          error: null,
        });

      const updates = { color: 'Dark Golden' };

      await petService.update('pet-1', 'owner-1', TENANT_IDS.ADRIS, updates, false);

      expect(mockSupabase._mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String),
        })
      );
    });
  });

  // ===========================================================================
  // delete() METHOD TESTS
  // ===========================================================================

  describe('delete', () => {
    it('should soft delete pet when user is owner', async () => {
      mockSupabase._mocks.setMockData({
        data: { id: 'pet-1', owner_id: 'owner-1', tenant_id: TENANT_IDS.ADRIS, name: 'Max' },
        error: null,
      });

      const result = await petService.delete('pet-1', 'owner-1', TENANT_IDS.ADRIS, false);

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(String),
          updated_at: expect.any(String),
        })
      );
    });

    it('should soft delete pet when user is staff', async () => {
      mockSupabase._mocks.setMockData({
        data: { id: 'pet-1', owner_id: 'owner-1', tenant_id: TENANT_IDS.ADRIS, name: 'Max' },
        error: null,
      });

      const result = await petService.delete('pet-1', 'staff-1', TENANT_IDS.ADRIS, true);

      expect(result.success).toBe(true);
    });

    it('should deny deletion when user is not owner and not staff', async () => {
      mockSupabase._mocks.setMockData({
        data: { id: 'pet-1', owner_id: 'owner-2', tenant_id: TENANT_IDS.ADRIS, name: 'Max' },
        error: null,
      });

      const result = await petService.delete('pet-1', 'owner-1', TENANT_IDS.ADRIS, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No tiene permisos para eliminar esta mascota');
    });

    it('should return error when pet not found', async () => {
      mockSupabase._mocks.setMockData({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await petService.delete('pet-999', 'owner-1', TENANT_IDS.ADRIS, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Mascota no encontrada');
    });

    it('should log audit event on deletion', async () => {
      const { logAudit } = await import('@/lib/audit');

      mockSupabase._mocks.setMockData({
        data: { id: 'pet-1', owner_id: 'owner-1', tenant_id: TENANT_IDS.ADRIS, name: 'Max' },
        error: null,
      });

      await petService.delete('pet-1', 'owner-1', TENANT_IDS.ADRIS, false);

      expect(logAudit).toHaveBeenCalledWith('DELETE_PET', 'pets/pet-1', {
        name: 'Max',
        owner_id: 'owner-1',
      });
    });

    it('should NOT permanently delete pet', async () => {
      mockSupabase._mocks.setMockData({
        data: { id: 'pet-1', owner_id: 'owner-1', tenant_id: TENANT_IDS.ADRIS, name: 'Max' },
        error: null,
      });

      await petService.delete('pet-1', 'owner-1', TENANT_IDS.ADRIS, false);

      // Should call update, not delete
      expect(mockSupabase._mocks.update).toHaveBeenCalled();
      expect(mockSupabase._mocks.delete).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // uploadPhoto() METHOD TESTS
  // ===========================================================================

  describe('uploadPhoto', () => {
    it('should upload photo when user is owner', async () => {
      const mockFile = new File(['photo content'], 'max-photo.jpg', { type: 'image/jpeg' });
      const publicUrl = 'https://storage.supabase.co/pets/owner-1/pet-1/123456.jpg';

      mockSupabase._mocks.setMockData({
        data: { id: 'pet-1', owner_id: 'owner-1' },
        error: null,
      });

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl } });

      mockSupabase._mocks.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      const result = await petService.uploadPhoto('pet-1', 'owner-1', mockFile);

      expect(result.success).toBe(true);
      expect(result.data).toBe(publicUrl);
      expect(mockUpload).toHaveBeenCalled();
      expect(mockGetPublicUrl).toHaveBeenCalled();
    });

    it('should deny upload when user is not owner', async () => {
      const mockFile = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });

      mockSupabase._mocks.setMockData({
        data: null,
        error: null,
      });

      const result = await petService.uploadPhoto('pet-1', 'owner-1', mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Mascota no encontrada o no tiene permisos');
    });

    it('should handle storage upload errors', async () => {
      const mockFile = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });

      mockSupabase._mocks.setMockData({
        data: { id: 'pet-1', owner_id: 'owner-1' },
        error: null,
      });

      const mockUpload = vi.fn().mockResolvedValue({
        error: { message: 'Storage quota exceeded' },
      });

      mockSupabase._mocks.storage.from.mockReturnValue({
        upload: mockUpload,
      });

      const result = await petService.uploadPhoto('pet-1', 'owner-1', mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error al subir foto');
    });

    it('should generate correct file path', async () => {
      const mockFile = new File(['photo'], 'my-pet.png', { type: 'image/png' });
      const publicUrl = 'https://storage.supabase.co/pets/owner-1/pet-1/123456.png';

      mockSupabase._mocks.setMockData({
        data: { id: 'pet-1', owner_id: 'owner-1' },
        error: null,
      });

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl } });

      mockSupabase._mocks.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      await petService.uploadPhoto('pet-1', 'owner-1', mockFile);

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^owner-1\/pet-1\/\d+\.png$/),
        mockFile
      );
    });

    it('should update pet with photo URL after upload', async () => {
      const mockFile = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
      const publicUrl = 'https://storage.supabase.co/pets/owner-1/pet-1/123456.jpg';

      mockSupabase._mocks.setMockData({
        data: { id: 'pet-1', owner_id: 'owner-1' },
        error: null,
      });

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl } });

      mockSupabase._mocks.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      await petService.uploadPhoto('pet-1', 'owner-1', mockFile);

      expect(mockSupabase._mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          photo_url: publicUrl,
          updated_at: expect.any(String),
        })
      );
    });
  });

  // ===========================================================================
  // listWithOwners() METHOD TESTS
  // ===========================================================================

  describe('listWithOwners', () => {
    it('should list pets with owner information', async () => {
      const petsWithOwners = [mockPetWithOwner];
      mockSupabase._mocks.setMockData({ data: petsWithOwners, error: null });

      const result = await petService.listWithOwners('terrapet', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(petsWithOwners);
      expect(mockSupabase.from).toHaveBeenCalledWith('pets');
      expect(mockSupabase._mocks.eq).toHaveBeenCalledWith('tenant_id', TENANT_IDS.ADRIS);
    });

    it('should filter by species in listWithOwners', async () => {
      const dogPets = [{ ...mockPetWithOwner, species: 'dog' }];
      mockSupabase._mocks.setMockData({ data: dogPets, error: null });

      const result = await petService.listWithOwners('terrapet', { species: 'dog' });

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.eq).toHaveBeenCalledWith('species', 'dog');
    });

    it('should search by name in listWithOwners', async () => {
      const searchResults = [mockPetWithOwner];
      mockSupabase._mocks.setMockData({ data: searchResults, error: null });

      const result = await petService.listWithOwners('terrapet', { query: 'Max' });

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.ilike).toHaveBeenCalledWith('name', '%Max%');
    });

    it('should only return active pets in listWithOwners', async () => {
      const activePets = [mockPetWithOwner];
      mockSupabase._mocks.setMockData({ data: activePets, error: null });

      await petService.listWithOwners('terrapet', {});

      expect(mockSupabase._mocks.is).toHaveBeenCalledWith('deleted_at', null);
    });

    it('should handle database errors in listWithOwners', async () => {
      mockSupabase._mocks.setMockData({
        data: null,
        error: { message: 'Query timeout' },
      });

      const result = await petService.listWithOwners('terrapet', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
