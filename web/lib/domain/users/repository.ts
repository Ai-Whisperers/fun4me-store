/**
 * User Repository - Data Access Layer
 *
 * Handles all database queries for user profiles.
 * Throws errors directly (no ServiceResult wrapping).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  UserProfile,
  UserListFilters,
  OwnerListFilters,
  UserRole,
  CreateUserData,
  UpdateUserData,
} from './types';

export class UserRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get Supabase client (for advanced queries)
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  // ==========================================================================
  // BASIC CRUD
  // ==========================================================================

  /**
   * Find user by ID
   *
   * @param id - User ID
   * @param tenantId - Tenant ID for access control
   * @returns User profile or null if not found
   */
  async findById(id: string, tenantId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('[UserRepository/findById] Database error:', { id, tenantId, error });
      throw error;
    }

    return data;
  }

  /**
   * Find user by email
   *
   * @param email - User email
   * @param tenantId - Tenant ID for access control
   * @returns User profile or null if not found
   */
  async findByEmail(email: string, tenantId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('[UserRepository/findByEmail] Database error:', { email, tenantId, error });
      throw error;
    }

    return data;
  }

  /**
   * Find all users for a tenant with optional filters
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns Array of user profiles
   */
  async findMany(tenantId: string, filters?: UserListFilters): Promise<UserProfile[]> {
    let query = this.supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId);

    // Include deleted users only if explicitly requested
    if (!filters?.include_deleted) {
      query = query.is('deleted_at', null);
    }

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

    query = query.order('full_name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('[UserRepository/findMany] Database error:', { tenantId, filters, error });
      throw error;
    }

    return data || [];
  }

  /**
   * Find users by role
   *
   * @param role - User role to filter by
   * @param tenantId - Tenant ID
   * @returns Array of user profiles
   */
  async findByRole(role: UserRole, tenantId: string): Promise<UserProfile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('role', role)
      .is('deleted_at', null)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('[UserRepository/findByRole] Database error:', { role, tenantId, error });
      throw error;
    }

    return data || [];
  }

  // ==========================================================================
  // SPECIALIZED QUERIES
  // ==========================================================================

  /**
   * Find all staff members (vets and admins)
   *
   * @param tenantId - Tenant ID
   * @returns Array of staff profiles
   */
  async findStaff(tenantId: string): Promise<UserProfile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('role', ['vet', 'admin'])
      .is('deleted_at', null)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('[UserRepository/findStaff] Database error:', { tenantId, error });
      throw error;
    }

    return data || [];
  }

  /**
   * Find all veterinarians
   *
   * @param tenantId - Tenant ID
   * @returns Array of vet profiles
   */
  async findVets(tenantId: string): Promise<UserProfile[]> {
    return this.findByRole('vet', tenantId);
  }

  /**
   * Find all administrators
   *
   * @param tenantId - Tenant ID
   * @returns Array of admin profiles
   */
  async findAdmins(tenantId: string): Promise<UserProfile[]> {
    return this.findByRole('admin', tenantId);
  }

  /**
   * Find owners with optional filters
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns Array of owner profiles
   */
  async findOwners(tenantId: string, filters?: OwnerListFilters): Promise<UserProfile[]> {
    let query = this.supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('role', 'owner')
      .is('deleted_at', null);

    // Apply filters
    if (filters?.search) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,client_code.ilike.%${filters.search}%`
      );
    }

    if (filters?.city) {
      query = query.eq('city', filters.city);
    }

    if (filters?.has_phone) {
      query = query.not('phone', 'is', null);
    }

    query = query.order('full_name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('[UserRepository/findOwners] Database error:', { tenantId, filters, error });
      throw error;
    }

    return data || [];
  }

  /**
   * Search users by query string
   *
   * @param query - Search query
   * @param tenantId - Tenant ID
   * @param filters - Optional additional filters
   * @returns Array of matching profiles
   */
  async search(query: string, tenantId: string, filters?: UserListFilters): Promise<UserProfile[]> {
    let dbQuery = this.supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .or(
        `full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,client_code.ilike.%${query}%`
      );

    // Apply additional filters
    if (filters?.role) {
      dbQuery = dbQuery.eq('role', filters.role);
    }

    if (filters?.is_staff) {
      dbQuery = dbQuery.in('role', ['vet', 'admin']);
    }

    dbQuery = dbQuery.order('full_name', { ascending: true }).limit(50); // Limit search results

    const { data, error } = await dbQuery;

    if (error) {
      console.error('[UserRepository/search] Database error:', { query, tenantId, filters, error });
      throw error;
    }

    return data || [];
  }

  /**
   * Count users by role
   *
   * @param tenantId - Tenant ID
   * @returns Record of role counts
   */
  async countByRole(tenantId: string): Promise<Record<UserRole, number>> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (error) {
      console.error('[UserRepository/countByRole] Database error:', { tenantId, error });
      throw error;
    }

    // Count by role
    const counts: Record<UserRole, number> = {
      owner: 0,
      vet: 0,
      admin: 0,
    };

    if (data) {
      data.forEach((profile) => {
        counts[profile.role as UserRole]++;
      });
    }

    return counts;
  }

  // ==========================================================================
  // WRITE OPERATIONS (used by service layer)
  // ==========================================================================

  /**
   * Create a new user profile
   *
   * @param data - User data
   * @param tenantId - Tenant ID
   * @returns Created user profile
   */
  async create(data: CreateUserData, tenantId: string): Promise<UserProfile> {
    const profileId = data.id || crypto.randomUUID();

    const { data: profile, error } = await this.supabase
      .from('profiles')
      .insert({
        ...data,
        id: profileId,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[UserRepository/create] Database error:', { data, tenantId, error });
      throw error;
    }

    return profile;
  }

  /**
   * Update a user profile
   *
   * @param id - User ID
   * @param data - Fields to update
   * @param tenantId - Tenant ID for access control
   * @returns Updated user profile
   */
  async update(id: string, data: UpdateUserData, tenantId: string): Promise<UserProfile> {
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('[UserRepository/update] Database error:', { id, data, tenantId, error });
      throw error;
    }

    if (!profile) {
      throw new Error('User not found');
    }

    return profile;
  }

  /**
   * Soft delete a user profile
   *
   * @param id - User ID
   * @param tenantId - Tenant ID for access control
   * @param deletedBy - ID of user performing deletion
   */
  async softDelete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (error) {
      console.error('[UserRepository/softDelete] Database error:', { id, tenantId, deletedBy, error });
      throw error;
    }
  }
}
