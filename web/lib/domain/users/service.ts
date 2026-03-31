/**
 * User Service - Business Logic Layer
 *
 * Handles user profile operations with business logic and validation.
 * Uses ServiceResult for backward compatibility with legacy service.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { UserRepository } from './repository';
import type {
  UserProfile,
  CreateUserData,
  UpdateUserData,
  UserListFilters,
  OwnerListFilters,
  UserRole,
  ServiceResult,
} from './types';

export class UserService {
  private repository: UserRepository;
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.repository = new UserRepository(supabase);
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * List user profiles for a tenant
   */
  async list(
    tenantId: string,
    filters?: UserListFilters
  ): Promise<ServiceResult<UserProfile[]>> {
    try {
      const users = await this.repository.findMany(tenantId, filters);
      return { success: true, data: users };
    } catch (error) {
      console.error('[UserService/list] Failed:', { tenantId, filters, error });
      return { success: false, error: 'Error al cargar usuarios' };
    }
  }

  /**
   * Get a user profile by ID
   */
  async getById(
    userId: string,
    tenantId: string
  ): Promise<ServiceResult<UserProfile>> {
    try {
      const user = await this.repository.findById(userId, tenantId);
      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }
      return { success: true, data: user };
    } catch (error) {
      console.error('[UserService/getById] Failed:', { userId, tenantId, error });
      return { success: false, error: 'Error al cargar usuario' };
    }
  }

  /**
   * Get a user profile by email
   */
  async getByEmail(
    email: string,
    tenantId: string
  ): Promise<ServiceResult<UserProfile | null>> {
    try {
      const user = await this.repository.findByEmail(email, tenantId);
      return { success: true, data: user };
    } catch (error) {
      console.error('[UserService/getByEmail] Failed:', { email, tenantId, error });
      return { success: false, error: 'Error al buscar usuario por email' };
    }
  }

  /**
   * List all staff members
   */
  async listStaff(tenantId: string): Promise<ServiceResult<UserProfile[]>> {
    try {
      const staff = await this.repository.findStaff(tenantId);
      return { success: true, data: staff };
    } catch (error) {
      console.error('[UserService/listStaff] Failed:', { tenantId, error });
      return { success: false, error: 'Error al cargar personal' };
    }
  }

  /**
   * List all veterinarians
   */
  async listVets(tenantId: string): Promise<ServiceResult<UserProfile[]>> {
    try {
      const vets = await this.repository.findVets(tenantId);
      return { success: true, data: vets };
    } catch (error) {
      console.error('[UserService/listVets] Failed:', { tenantId, error });
      return { success: false, error: 'Error al cargar veterinarios' };
    }
  }

  /**
   * List all administrators
   */
  async listAdmins(tenantId: string): Promise<ServiceResult<UserProfile[]>> {
    try {
      const admins = await this.repository.findAdmins(tenantId);
      return { success: true, data: admins };
    } catch (error) {
      console.error('[UserService/listAdmins] Failed:', { tenantId, error });
      return { success: false, error: 'Error al cargar administradores' };
    }
  }

  /**
   * List pet owners
   */
  async listOwners(
    tenantId: string,
    filters?: OwnerListFilters
  ): Promise<ServiceResult<UserProfile[]>> {
    try {
      const owners = await this.repository.findOwners(tenantId, filters);
      return { success: true, data: owners };
    } catch (error) {
      console.error('[UserService/listOwners] Failed:', { tenantId, filters, error });
      return { success: false, error: 'Error al cargar propietarios' };
    }
  }

  /**
   * Search users
   */
  async search(
    query: string,
    tenantId: string,
    filters?: UserListFilters
  ): Promise<ServiceResult<UserProfile[]>> {
    try {
      const users = await this.repository.search(query, tenantId, filters);
      return { success: true, data: users };
    } catch (error) {
      console.error('[UserService/search] Failed:', { query, tenantId, filters, error });
      return { success: false, error: 'Error al buscar usuarios' };
    }
  }

  // ==========================================================================
  // WRITE OPERATIONS
  // ==========================================================================

  /**
   * Create a new user profile
   */
  async create(
    tenantId: string,
    userData: CreateUserData
  ): Promise<ServiceResult<UserProfile>> {
    try {
      // Check if user already exists
      if (userData.email) {
        const existing = await this.repository.findByEmail(userData.email, tenantId);
        if (existing) {
          return { success: false, error: 'Ya existe un usuario con este email' };
        }
      }

      const user = await this.repository.create(userData, tenantId);
      return { success: true, data: user };
    } catch (error) {
      console.error('[UserService/create] Failed:', { tenantId, userData, error });
      return { success: false, error: 'Error al crear usuario' };
    }
  }

  /**
   * Update a user profile
   */
  async update(
    userId: string,
    tenantId: string,
    updates: UpdateUserData
  ): Promise<ServiceResult<UserProfile>> {
    try {
      const user = await this.repository.update(userId, updates, tenantId);
      return { success: true, data: user };
    } catch (error) {
      console.error('[UserService/update] Failed:', { userId, tenantId, updates, error });
      return { success: false, error: 'Error al actualizar usuario' };
    }
  }

  /**
   * Update user role
   */
  async updateRole(
    userId: string,
    tenantId: string,
    newRole: UserRole
  ): Promise<ServiceResult<UserProfile>> {
    try {
      // Check last admin protection
      const user = await this.repository.findById(userId, tenantId);
      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      if (user.role === 'admin' && newRole !== 'admin') {
        const admins = await this.repository.findAdmins(tenantId);
        if (admins.length <= 1) {
          return { success: false, error: 'No se puede cambiar el rol del último administrador' };
        }
      }

      const updatedUser = await this.repository.update(userId, { role: newRole }, tenantId);
      return { success: true, data: updatedUser };
    } catch (error) {
      console.error('[UserService/updateRole] Failed:', { userId, tenantId, newRole, error });
      return { success: false, error: 'Error al actualizar rol' };
    }
  }

  /**
   * Soft delete a user
   */
  async delete(
    userId: string,
    tenantId: string,
    deletedBy: string
  ): Promise<ServiceResult<void>> {
    try {
      // Check last admin protection
      const user = await this.repository.findById(userId, tenantId);
      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      if (user.role === 'admin') {
        const admins = await this.repository.findAdmins(tenantId);
        if (admins.length <= 1) {
          return { success: false, error: 'No se puede eliminar el último administrador' };
        }
      }

      await this.repository.softDelete(userId, tenantId, deletedBy);
      return { success: true, data: undefined };
    } catch (error) {
      console.error('[UserService/delete] Failed:', { userId, tenantId, deletedBy, error });
      return { success: false, error: 'Error al eliminar usuario' };
    }
  }

  /**
   * Get user statistics
   */
  async getStats(tenantId: string): Promise<ServiceResult<{
    total: number
    by_role: { owner: number; vet: number; admin: number }
    staff_count: number
    active_owners: number
  }>> {
    try {
      const counts = await this.repository.countByRole(tenantId);
      const total = counts.owner + counts.vet + counts.admin;
      const staff_count = counts.vet + counts.admin;

      const stats = {
        total,
        by_role: counts,
        staff_count,
        active_owners: counts.owner,
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('[UserService/getStats] Failed:', { tenantId, error });
      return { success: false, error: 'Error al cargar estadísticas' };
    }
  }
}
