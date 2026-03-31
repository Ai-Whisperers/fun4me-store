/**
 * PetService - Pet Management Service Layer (CORE MVP)
 *
 * Handles CORE pet operations only:
 * - Pet CRUD (create, read, update, delete)
 * - Owner access control
 * - Photo upload management
 *
 * DEFERRED TO PHASE 2+:
 * - Vaccines
 * - Medical records
 * - QR codes
 * - Growth tracking
 * - Transfer ownership
 * - Microchip tracking
 *
 * @example
 * ```typescript
 * const service = new PetService(supabase);
 * const result = await service.create('owner-123', 'terrapet', {
 *   name: 'Max',
 *   species: 'dog',
 *   breed: 'Labrador'
 * });
 * ```
 */

import { BaseService, type ServiceResult } from './base-service';
import type {
  Pet,
  PetWithOwner,
} from '@/lib/types/entities/pet';
import {
  mapPetsWithOwner,
  type RawPetWithOwner,
} from './mappers/pet-mapper';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Filters for listing pets
 */
export interface PetListFilters {
  /** Search by pet name */
  query?: string;
  /** Filter by species */
  species?: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
  /** Include deleted pets (admin only) */
  includeDeleted?: boolean;
}

/**
 * Input for creating a pet
 */
export interface CreatePetData {
  name: string;
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
  breed?: string | null;
  birth_date?: string | null;
  weight_kg?: number | null;
  sex?: 'male' | 'female' | null;
  color?: string | null;
  is_neutered?: boolean | null;
  microchip_number?: string | null;
  photo_url?: string | null;
  notes?: string | null;
}

/**
 * Input for updating a pet
 */
export interface UpdatePetData {
  name?: string;
  breed?: string | null;
  birth_date?: string | null;
  weight_kg?: number | null;
  sex?: 'male' | 'female' | null;
  color?: string | null;
  is_neutered?: boolean | null;
  microchip_number?: string | null;
  photo_url?: string | null;
  notes?: string | null;
}

// =============================================================================
// PET SERVICE
// =============================================================================

export class PetService extends BaseService {
  /**
   * List pets for an owner
   *
   * @param ownerId - Owner user ID
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @param isStaff - Whether requester is staff
   * @returns List of pets
   */
  async list(
    ownerId: string,
    tenantId: string,
    filters: PetListFilters = {},
    isStaff: boolean = false
  ): Promise<ServiceResult<Pet[]>> {
    return this.handleError(
      async () => {
        const { query, species, includeDeleted = false } = filters;

        let petsQuery = this.supabase
          .from('pets')
          .select(
            `
            id,
            owner_id,
            tenant_id,
            name,
            species,
            breed,
            birth_date,
            weight_kg,
            microchip_number,
            photo_url,
            sex,
            color,
            is_neutered,
            temperament,
            diet_category,
            diet_notes,
            allergies,
            chronic_conditions,
            notes,
            created_at,
            updated_at,
            deleted_at
          `
          )
          .order('created_at', { ascending: false });

        // Filter by ownership: staff can see all pets in tenant, owners only their own
        if (isStaff) {
          petsQuery = petsQuery.eq('tenant_id', tenantId);
        } else {
          petsQuery = petsQuery.eq('owner_id', ownerId);
        }

        // Only include deleted if explicitly requested and user is staff
        if (!includeDeleted || !isStaff) {
          petsQuery = petsQuery.is('deleted_at', null);
        }

        // Apply filters
        if (query) {
          petsQuery = petsQuery.ilike('name', `%${query}%`);
        }

        if (species) {
          petsQuery = petsQuery.eq('species', species);
        }

        const { data, error } = await petsQuery;

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        return (data || []) as Pet[];
      },
      'Error al cargar mascotas',
      { context: { ownerId, tenantId, filters } }
    );
  }

  /**
   * Get single pet by ID with owner validation
   *
   * @param id - Pet ID
   * @param ownerId - Owner user ID (for access control)
   * @param tenantId - Tenant ID
   * @param isStaff - Whether requester is staff
   * @returns Pet details
   */
  async getById(
    id: string,
    ownerId: string,
    tenantId: string,
    isStaff: boolean = false
  ): Promise<ServiceResult<Pet>> {
    return this.handleError(
      async () => {
        const { data: pet, error } = await this.supabase
          .from('pets')
          .select('*')
          .eq('id', id)
          .is('deleted_at', null)
          .single();

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        if (!pet) {
          throw new Error('Mascota no encontrada');
        }

        // Check access - owner or staff from same tenant
        if (!isStaff && pet.owner_id !== ownerId) {
          throw new Error('No tiene permisos para ver esta mascota');
        }

        if (isStaff) {
          this.validateTenantAccess(pet.tenant_id, tenantId, 'pet');
        }

        return pet as Pet;
      },
      'Error al cargar mascota',
      { context: { petId: id, ownerId, tenantId } }
    );
  }

  /**
   * Create a new pet
   *
   * @param ownerId - Owner user ID
   * @param tenantId - Tenant ID (clinic)
   * @param data - Pet data
   * @returns Created pet
   */
  async create(
    ownerId: string,
    tenantId: string,
    data: CreatePetData
  ): Promise<ServiceResult<Pet>> {
    return this.handleError(
      async () => {
        // Validate required fields
        this.validateRequiredFields(
          { name: data.name, species: data.species },
          ['name', 'species']
        );

        // Insert pet
        const { data: pet, error } = await this.supabase
          .from('pets')
          .insert({
            owner_id: ownerId,
            tenant_id: tenantId,
            name: data.name,
            species: data.species,
            breed: data.breed || null,
            birth_date: data.birth_date || null,
            weight_kg: data.weight_kg || null,
            sex: data.sex || null,
            color: data.color || null,
            is_neutered: data.is_neutered || null,
            microchip_number: data.microchip_number || null,
            photo_url: data.photo_url || null,
            notes: data.notes || null,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        // Audit log
        const { logAudit } = await import('@/lib/audit');
        await logAudit('CREATE_PET', `pets/${pet.id}`, {
          name: pet.name,
          species: pet.species,
          owner_id: ownerId,
        });

        return pet as Pet;
      },
      'Error al crear mascota',
      { context: { ownerId, tenantId, data } }
    );
  }

  /**
   * Update pet information
   *
   * @param id - Pet ID
   * @param ownerId - Owner user ID (for access control)
   * @param tenantId - Tenant ID
   * @param updates - Fields to update
   * @param isStaff - Whether requester is staff
   * @returns Updated pet
   */
  async update(
    id: string,
    ownerId: string,
    tenantId: string,
    updates: UpdatePetData,
    isStaff: boolean = false
  ): Promise<ServiceResult<Pet>> {
    return this.handleError(
      async () => {
        // Get current pet
        const { data: existing, error: fetchError } = await this.supabase
          .from('pets')
          .select('id, owner_id, tenant_id')
          .eq('id', id)
          .is('deleted_at', null)
          .single();

        if (fetchError || !existing) {
          throw new Error('Mascota no encontrada');
        }

        // Check access
        if (!isStaff && existing.owner_id !== ownerId) {
          throw new Error('No tiene permisos para modificar esta mascota');
        }

        if (isStaff) {
          this.validateTenantAccess(existing.tenant_id, tenantId, 'pet');
        }

        // Update pet
        const { data: updated, error: updateError } = await this.supabase
          .from('pets')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          throw new Error(this.mapDatabaseError(updateError));
        }

        // Audit log
        const { logAudit } = await import('@/lib/audit');
        await logAudit('UPDATE_PET', `pets/${id}`, { updates });

        return updated as Pet;
      },
      'Error al actualizar mascota',
      { context: { petId: id, ownerId, updates } }
    );
  }

  /**
   * Delete pet (soft delete)
   *
   * @param id - Pet ID
   * @param ownerId - Owner user ID (for access control)
   * @param tenantId - Tenant ID
   * @param isStaff - Whether requester is staff
   * @returns Success indicator
   */
  async delete(
    id: string,
    ownerId: string,
    tenantId: string,
    isStaff: boolean = false
  ): Promise<ServiceResult<void>> {
    return this.handleError(
      async () => {
        // Get current pet
        const { data: existing, error: fetchError } = await this.supabase
          .from('pets')
          .select('id, owner_id, tenant_id, name')
          .eq('id', id)
          .is('deleted_at', null)
          .single();

        if (fetchError || !existing) {
          throw new Error('Mascota no encontrada');
        }

        // Check access
        if (!isStaff && existing.owner_id !== ownerId) {
          throw new Error('No tiene permisos para eliminar esta mascota');
        }

        if (isStaff) {
          this.validateTenantAccess(existing.tenant_id, tenantId, 'pet');
        }

        // Soft delete
        const { error: deleteError } = await this.supabase
          .from('pets')
          .update({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (deleteError) {
          throw new Error(this.mapDatabaseError(deleteError));
        }

        // Audit log
        const { logAudit } = await import('@/lib/audit');
        await logAudit('DELETE_PET', `pets/${id}`, {
          name: existing.name,
          owner_id: ownerId,
        });
      },
      'Error al eliminar mascota',
      { context: { petId: id, ownerId } }
    );
  }

  /**
   * Upload photo for pet
   *
   * @param petId - Pet ID
   * @param ownerId - Owner user ID
   * @param file - Photo file
   * @returns Public URL of uploaded photo
   */
  async uploadPhoto(
    petId: string,
    ownerId: string,
    file: File
  ): Promise<ServiceResult<string>> {
    return this.handleError(
      async () => {
        // Verify pet ownership
        const { data: pet } = await this.supabase
          .from('pets')
          .select('id, owner_id')
          .eq('id', petId)
          .eq('owner_id', ownerId)
          .is('deleted_at', null)
          .single();

        if (!pet) {
          throw new Error('Mascota no encontrada o no tiene permisos');
        }

        // Upload to storage
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${ownerId}/${petId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await this.supabase.storage
          .from('pets')
          .upload(fileName, file);

        if (uploadError) {
          throw new Error('Error al subir foto: ' + uploadError.message);
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = this.supabase.storage.from('pets').getPublicUrl(fileName);

        // Update pet with photo URL
        await this.supabase
          .from('pets')
          .update({
            photo_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', petId);

        return publicUrl;
      },
      'Error al subir foto de mascota',
      { context: { petId, ownerId } }
    );
  }

  /**
   * Get pets with their owners (staff only - for appointments, invoices)
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns List of pets with owner information
   */
  async listWithOwners(
    tenantId: string,
    filters: PetListFilters = {}
  ): Promise<ServiceResult<PetWithOwner[]>> {
    return this.handleError(
      async () => {
        const { query, species } = filters;

        let petsQuery = this.supabase
          .from('pets')
          .select(
            `
            *,
            owner:profiles!pets_owner_id_fkey(id, full_name, email, phone)
          `
          )
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        // Apply filters
        if (query) {
          petsQuery = petsQuery.ilike('name', `%${query}%`);
        }

        if (species) {
          petsQuery = petsQuery.eq('species', species);
        }

        const { data, error } = await petsQuery;

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        return mapPetsWithOwner((data || []) as RawPetWithOwner[]);
      },
      'Error al cargar mascotas con dueños',
      { context: { tenantId, filters } }
    );
  }
}
