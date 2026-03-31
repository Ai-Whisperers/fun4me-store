/**
 * User Domain - Public API
 * 
 * This is the single entry point for the user domain.
 * All external modules should import from this file only.
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  UserRole,
  ContactMethod,
  DocumentType,
  UserProfile,
  ClinicInvite,
  UserWithMetadata,
  CreateUserData,
  UpdateUserData,
  UserListFilters,
  OwnerListFilters,
  UserStats,
  ServiceResult,
} from './types';

// =============================================================================
// CLASS EXPORTS
// =============================================================================

export { UserRepository } from './repository';
export { UserService } from './service';

// =============================================================================
// QUERY FUNCTION EXPORTS
// =============================================================================

export {
  getUserStats,
  getUsersWithPets,
  getRecentlyActive,
  getOwnersWithoutPets,
} from './queries';

// =============================================================================
// CONVENIENCE FACTORY
// =============================================================================

import { SupabaseClient } from '@supabase/supabase-js';
import { UserService } from './service';

/**
 * Create a new UserService instance with proper dependency injection
 * 
 * @param supabase - Authenticated Supabase client
 * @returns Configured UserService ready to use
 * 
 * @example
 * ```typescript
 * import { createUserService } from '@/lib/domain/users';
 * 
 * const supabase = await createClient();
 * const service = createUserService(supabase);
 * 
 * const result = await service.list(tenantId);
 * ```
 */
export function createUserService(supabase: SupabaseClient): UserService {
  return new UserService(supabase);
}
