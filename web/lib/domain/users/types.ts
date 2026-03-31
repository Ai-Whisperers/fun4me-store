/**
 * User Domain - Type Definitions
 *
 * All types related to user/profile management
 */

// =============================================================================
// BASIC TYPES
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

// =============================================================================
// ENTITY TYPES
// =============================================================================

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
  
  // Audit fields
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at: string;
  updated_at: string;
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

/**
 * User with additional metadata (for queries)
 */
export interface UserWithMetadata extends UserProfile {
  pet_count?: number;
  appointment_count?: number;
  last_visit?: string | null;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

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

// =============================================================================
// FILTER TYPES
// =============================================================================

/**
 * Filters for listing users
 */
export interface UserListFilters {
  role?: UserRole;
  search?: string; // Search in name, email, client_code
  is_staff?: boolean; // role in ['vet', 'admin']
  has_phone?: boolean;
  city?: string;
  include_deleted?: boolean; // Include soft-deleted users
}

/**
 * Filters for owner queries
 */
export interface OwnerListFilters {
  search?: string;
  city?: string;
  has_pets?: boolean;
  has_phone?: boolean;
}

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * User statistics
 */
export interface UserStats {
  total: number;
  by_role: {
    owner: number;
    vet: number;
    admin: number;
  };
  staff_count: number;
  active_owners: number;
  owners_with_pets: number;
  recent_signups: number; // Last 30 days
}

/**
 * Service result wrapper (for backward compatibility)
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
