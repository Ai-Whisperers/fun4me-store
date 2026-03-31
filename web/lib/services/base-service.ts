/**
 * BaseService - Abstract Service Layer Foundation
 *
 * All services extend this class to inherit:
 * - Consistent error handling
 * - Transaction management
 * - Tenant validation
 * - Standardized result types
 * - Logging integration
 *
 * @example
 * ```typescript
 * export class AppointmentService extends BaseService {
 *   async list(tenantId: string): Promise<ServiceResult<Appointment[]>> {
 *     return this.handleError(
 *       async () => {
 *         const { data, error } = await this.supabase
 *           .from('appointments')
 *           .select('*')
 *           .eq('tenant_id', tenantId);
 *         
 *         if (error) throw error;
 *         return data;
 *       },
 *       'Failed to fetch appointments'
 *     );
 *   }
 * }
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { ERROR_MESSAGES } from '@/lib/i18n/errors';

// =============================================================================
// SERVICE RESULT TYPES
// =============================================================================

/**
 * Success result from a service operation
 */
export interface ServiceSuccess<T> {
  success: true;
  data: T;
}

/**
 * Error result from a service operation
 */
export interface ServiceError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Union type for all service results
 */
export type ServiceResult<T> = ServiceSuccess<T> | ServiceError;

/**
 * Options for handleError method
 */
interface ErrorHandlerOptions {
  /** Context for logging (additional metadata) */
  context?: Record<string, unknown>;
  /** Custom error code */
  code?: string;
  /** Details to include in error response */
  details?: Record<string, unknown>;
}

// =============================================================================
// BASE SERVICE CLASS
// =============================================================================

/**
 * Abstract base class for all domain services
 *
 * Provides consistent patterns for:
 * - Error handling and logging
 * - Tenant validation
 * - Database transactions
 * - Result type standardization
 */
export abstract class BaseService {
  /**
   * @param supabase - Supabase client instance (server or client-side)
   */
  constructor(protected readonly supabase: SupabaseClient) {}

  /**
   * Wraps service operations with consistent error handling
   *
   * @param operation - Async function containing the service logic
   * @param errorMessage - User-friendly error message
   * @param options - Additional error handling options
   * @returns Standardized service result
   *
   * @example
   * ```typescript
   * async getById(id: string): Promise<ServiceResult<Pet>> {
   *   return this.handleError(
   *     async () => {
   *       const { data, error } = await this.supabase
   *         .from('pets')
   *         .select('*')
   *         .eq('id', id)
   *         .single();
   *       
   *       if (error) throw error;
   *       if (!data) throw new Error('Pet not found');
   *       return data;
   *     },
   *     'Failed to fetch pet',
   *     { context: { petId: id } }
   *   );
   * }
   * ```
   */
  protected async handleError<T>(
    operation: () => Promise<T>,
    errorMessage: string,
    options: ErrorHandlerOptions = {}
  ): Promise<ServiceResult<T>> {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error: unknown) {
      // Extract specific error message, handling Supabase error objects
      let specificError: string;
      if (error instanceof Error) {
        specificError = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        // Handle Supabase/PostgreSQL error objects { message: string, code?: string }
        specificError = (error as { message: string }).message;
      } else {
        specificError = String(error);
      }
      
      // Log error with context
      logger.error(errorMessage, {
        error: specificError,
        stack: error instanceof Error ? error.stack : undefined,
        ...options.context,
      });

      // Return standardized error with specific message in error field
      return {
        success: false,
        error: specificError,
        code: options.code,
        details: {
          message: specificError,
          ...options.details,
        },
      };
    }
  }

  /**
   * Validates tenant access for multi-tenant operations
   *
   * Throws an error if the resource doesn't belong to the tenant
   *
   * @param resourceTenantId - Tenant ID from the resource
   * @param requestTenantId - Tenant ID from the request
   * @param resourceType - Type of resource (for error messages)
   * @throws Error if tenant IDs don't match
   *
   * @example
   * ```typescript
   * async update(id: string, tenantId: string, data: UpdateData): Promise<ServiceResult<Pet>> {
   *   return this.handleError(
   *     async () => {
   *       // Fetch resource
   *       const { data: pet } = await this.supabase
   *         .from('pets')
   *         .select('tenant_id')
   *         .eq('id', id)
   *         .single();
   *       
   *       if (!pet) throw new Error('Pet not found');
   *       
   *       // Validate tenant access
   *       this.validateTenantAccess(pet.tenant_id, tenantId, 'pet');
   *       
   *       // Proceed with update...
   *     },
   *     'Failed to update pet'
   *   );
   * }
   * ```
   */
  protected validateTenantAccess(
    resourceTenantId: string,
    requestTenantId: string,
    resourceType: string = 'resource'
  ): void {
    if (resourceTenantId !== requestTenantId) {
      throw new Error(ERROR_MESSAGES.AUTH.FORBIDDEN_TENANT
      );
    }
  }

  /**
   * Executes a database transaction with automatic rollback on error
   *
   * NOTE: Supabase JS client doesn't support transactions directly.
   * For complex multi-step operations, use database functions (RPC) with transactions.
   *
   * This is a placeholder for future transaction support or RPC wrapper.
   *
   * @param operations - Async function containing transaction operations
   * @returns Transaction result
   *
   * @example
   * ```typescript
   * async transferPet(petId: string, fromOwner: string, toOwner: string): Promise<ServiceResult<void>> {
   *   return this.executeTransaction(async () => {
   *     // Step 1: Update pet owner
   *     await this.supabase
   *       .from('pets')
   *       .update({ owner_id: toOwner })
   *       .eq('id', petId);
   *     
   *     // Step 2: Create transfer record
   *     await this.supabase
   *       .from('pet_transfers')
   *       .insert({ pet_id: petId, from_owner: fromOwner, to_owner: toOwner });
   *   });
   * }
   * ```
   */
  protected async executeTransaction<T>(
    operations: () => Promise<T>
  ): Promise<ServiceResult<T>> {
    // For now, just execute the operations
    // In production, wrap with database transaction via RPC
    return this.handleError(operations, 'Transaction failed');
  }

  /**
   * Maps database errors to user-friendly messages
   *
   * @param error - Database error
   * @returns User-friendly error message
   *
   * @example
   * ```typescript
   * try {
   *   await this.supabase.from('pets').insert(data);
   * } catch (error) {
   *   const message = this.mapDatabaseError(error);
   *   throw new Error(message);
   * }
   * ```
   */
  protected mapDatabaseError(error: unknown): string {
    if (error && typeof error === 'object' && 'code' in error) {
      const dbError = error as { code: string; message?: string };

      // PostgreSQL error codes
      switch (dbError.code) {
        case '23505': // unique_violation
          return 'Este registro ya existe en el sistema';
        case '23503': // foreign_key_violation
          return 'Operación no permitida: registro relacionado no existe';
        case '23502': // not_null_violation
          return 'Faltan campos requeridos';
        case '22P02': // invalid_text_representation
          return 'Formato de datos inválido';
        case 'PGRST116': // RLS violation
          return 'No tiene permisos para realizar esta operación';
        default:
          return dbError.message || 'Error de base de datos';
      }
    }

    return error instanceof Error ? error.message : 'Error desconocido';
  }

  /**
   * Validates required fields in input data
   *
   * @param data - Input data object
   * @param requiredFields - Array of required field names
   * @throws Error if any required field is missing or empty
   *
   * @example
   * ```typescript
   * async create(data: CreatePetInput): Promise<ServiceResult<Pet>> {
   *   return this.handleError(
   *     async () => {
   *       // Validate required fields
   *       this.validateRequiredFields(data, ['name', 'species', 'owner_id']);
   *       
   *       // Proceed with creation...
   *     },
   *     'Failed to create pet'
   *   );
   * }
   * ```
   */
  protected validateRequiredFields(
    data: Record<string, unknown>,
    requiredFields: string[]
  ): void {
    const missing = requiredFields.filter((field) => {
      const value = data[field];
      // Null or undefined are missing
      if (value === null || value === undefined) return true;
      // Empty strings or whitespace-only strings are missing
      if (typeof value === 'string' && !value.trim()) return true;
      // 0, false, and other falsy values are VALID
      return false;
    });

    if (missing.length > 0) {
      throw new Error(`Campos requeridos faltantes: ${missing.join(', ')}`);
    }
  }
}
