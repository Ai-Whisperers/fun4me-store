/**
 * UserService - User/Profile Management Service Layer
 *
 * Handles user profile operations:
 * - Profile CRUD (owners, vets, admins)
 * - Role management
 * - User search and filtering
 * - Clinic invitations
 * - Staff management
 *
 * @example
 * ```typescript
 * const service = new UserService(supabase);
 * const result = await service.list('terrapet', { role: 'vet' });
 * ```
 */

import { BaseService, type ServiceResult } from './base-service';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * User roles in the system
 */
export type UserRole = 'owner' | 'vet' | 'admin';

/**
 * Preferred contact methods
 */
export type ContactMethod = 'phone' | 'email' | 'whatsapp' | 'sms';

/**
 * Document types for identification
 */
export type DocumentType = 'CI' | 'RUC' | 'Pasaporte';

/**
 * User profile data structure
 */
export interface UserProfile {
  id: string;
  tenant_id: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  secondary_phone?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  
  // Client fields
  client_code?: string | null;
  address?: string | null;
  city?: string | null;
  document_type?: DocumentType | null;
  document_number?: string | null;
  preferred_contact?: ContactMethod;
  notes?: string | null;
  
  // Staff fields
  signature_url?: string | null;
  license_number?: string | null;
  specializations?: string[] | null;
  bio?: string | null;
  
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a user profile
 */
export interface CreateUserData {
  id?: string; // Optional: if creating from existing auth user
  tenant_id?: string | null;
  full_name?: string;
  email?: string;
  phone?: string;
  secondary_phone?: string;
  avatar_url?: string;
  role: UserRole;
  
  // Client fields
  client_code?: string;
  address?: string;
  city?: string;
  document_type?: DocumentType;
  document_number?: string;
  preferred_contact?: ContactMethod;
  notes?: string;
  
  // Staff fields
  signature_url?: string;
  license_number?: string;
  specializations?: string[];
  bio?: string;
}

/**
 * Input for updating a user profile
 */
export interface UpdateUserData {
  full_name?: string;
  email?: string;
  phone?: string;
  secondary_phone?: string;
  avatar_url?: string;
  role?: UserRole;
  
  // Client fields
  client_code?: string;
  address?: string;
  city?: string;
  document_type?: DocumentType;
  document_number?: string;
  preferred_contact?: ContactMethod;
  notes?: string;
  
  // Staff fields
  signature_url?: string;
  license_number?: string;
  specializations?: string[];
  bio?: string;
}

/**
 * Filters for listing users
 */
export interface UserListFilters {
  role?: UserRole;
  search?: string; // Search in name, email, client_code
  is_staff?: boolean; // role in ['vet', 'admin']
  has_phone?: boolean;
  city?: string;
}

/**
 * Clinic invite data
 */
export interface ClinicInvite {
  id: string;
  tenant_id: string;
  email: string;
  role: UserRole;
  invited_by?: string | null;
  expires_at: string;
  accepted: boolean;
  created_at: string;
}

// =============================================================================
// USER SERVICE
// =============================================================================

export class UserService extends BaseService {
  // ---------------------------------------------------------------------------
  // PROFILE CRUD
  // ---------------------------------------------------------------------------

  /**
   * List user profiles for a tenant
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns List of user profiles
   */
  async list(
    tenantId: string,
    filters?: UserListFilters
  ): Promise<ServiceResult<UserProfile[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('full_name', { ascending: true });

      // Apply filters
      if (filters?.role) {
        query = query.eq('role', filters.role);
      }

      if (filters?.is_staff) {
        query = query.in('role', ['vet', 'admin']);
      }

      if (filters?.city) {
        query = query.eq('city', filters.city);
      }

      if (filters?.has_phone) {
        query = query.not('phone', 'is', null);
      }

      if (filters?.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,client_code.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch users');
  }

  /**
   * Get a user profile by ID
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID for access control
   * @returns User profile
   */
  async getById(
    userId: string,
    tenantId: string
  ): Promise<ServiceResult<UserProfile>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      if (!data) throw new Error('User not found');
      return data;
    }, 'Failed to fetch user');
  }

  /**
   * Get a user profile by email
   *
   * @param email - User email
   * @param tenantId - Tenant ID for access control
   * @returns User profile
   */
  async getByEmail(
    email: string,
    tenantId: string
  ): Promise<ServiceResult<UserProfile | null>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

      if (error) {
        // Return null if not found (not an error)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data;
    }, 'Failed to fetch user by email');
  }

  /**
   * Create a new user profile
   *
   * @param tenantId - Tenant ID
   * @param userData - User data
   * @returns Created user profile
   */
  async create(
    tenantId: string,
    userData: CreateUserData
  ): Promise<ServiceResult<UserProfile>> {
    return this.handleError(async () => {
      // Check if user already exists
      if (userData.email) {
        const existing = await this.getByEmail(userData.email, tenantId);
        if (existing.success && existing.data) {
          throw new Error('User with this email already exists in this tenant');
        }
      }

      // Generate UUID for the profile if not provided
      const profileId = userData.id || crypto.randomUUID();

      // Create profile
      const { data, error } = await this.supabase
        .from('profiles')
        .insert({
          ...userData,
          id: profileId,
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to create user');
  }

  /**
   * Update a user profile
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID for access control
   * @param updates - Fields to update
   * @returns Updated user profile
   */
  async update(
    userId: string,
    tenantId: string,
    updates: UpdateUserData
  ): Promise<ServiceResult<UserProfile>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('User not found');
      return data;
    }, 'Failed to update user');
  }

  /**
   * Update user role
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID for access control
   * @param newRole - New role to assign
   * @returns Updated user profile
   */
  async updateRole(
    userId: string,
    tenantId: string,
    newRole: UserRole
  ): Promise<ServiceResult<UserProfile>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('profiles')
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('User not found');
      return data;
    }, 'Failed to update user role');
  }

  /**
   * Soft delete a user profile
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID for access control
   * @param deletedBy - User ID performing deletion
   * @returns Success boolean
   */
  async delete(
    userId: string,
    tenantId: string,
    deletedBy: string
  ): Promise<ServiceResult<boolean>> {
    return this.handleError(async () => {
      const { error } = await this.supabase
        .from('profiles')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy,
        })
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (error) throw error;
      return true;
    }, 'Failed to delete user');
  }

  // ---------------------------------------------------------------------------
  // STAFF MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Get all staff members (vets and admins)
   *
   * @param tenantId - Tenant ID
   * @returns List of staff members
   */
  async listStaff(tenantId: string): Promise<ServiceResult<UserProfile[]>> {
    return this.list(tenantId, { is_staff: true });
  }

  /**
   * Get all veterinarians
   *
   * @param tenantId - Tenant ID
   * @returns List of veterinarians
   */
  async listVets(tenantId: string): Promise<ServiceResult<UserProfile[]>> {
    return this.list(tenantId, { role: 'vet' });
  }

  /**
   * Get all admins
   *
   * @param tenantId - Tenant ID
   * @returns List of admins
   */
  async listAdmins(tenantId: string): Promise<ServiceResult<UserProfile[]>> {
    return this.list(tenantId, { role: 'admin' });
  }

  /**
   * Get all pet owners/clients
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns List of owners
   */
  async listOwners(
    tenantId: string,
    filters?: Omit<UserListFilters, 'role' | 'is_staff'>
  ): Promise<ServiceResult<UserProfile[]>> {
    return this.list(tenantId, { ...filters, role: 'owner' });
  }

  // ---------------------------------------------------------------------------
  // SEARCH & UTILITIES
  // ---------------------------------------------------------------------------

  /**
   * Search users by name, email, or client code
   *
   * @param tenantId - Tenant ID
   * @param searchTerm - Search term
   * @returns List of matching users
   */
  async search(
    tenantId: string,
    searchTerm: string
  ): Promise<ServiceResult<UserProfile[]>> {
    return this.list(tenantId, { search: searchTerm });
  }

  /**
   * Get user statistics for a tenant
   *
   * @param tenantId - Tenant ID
   * @returns User statistics
   */
  async getStats(tenantId: string): Promise<ServiceResult<{
    total: number;
    owners: number;
    vets: number;
    admins: number;
    withPhone: number;
  }>> {
    return this.handleError(async () => {
      const { data: all, error: allError } = await this.supabase
        .from('profiles')
        .select('role, phone', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (allError) throw allError;

      const stats = {
        total: all?.length || 0,
        owners: all?.filter(u => u.role === 'owner').length || 0,
        vets: all?.filter(u => u.role === 'vet').length || 0,
        admins: all?.filter(u => u.role === 'admin').length || 0,
        withPhone: all?.filter(u => u.phone !== null).length || 0,
      };

      return stats;
    }, 'Failed to fetch user statistics');
  }
}
