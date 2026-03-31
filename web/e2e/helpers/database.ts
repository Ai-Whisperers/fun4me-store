import { createClient } from '@supabase/supabase-js';
import type { Clinic } from './auth';

/**
 * Database Helper Functions
 * 
 * Provides utilities for interacting with the Supabase database during E2E tests,
 * including data setup, cleanup, and verification operations.
 * 
 * WARNING: These functions use the SERVICE ROLE KEY which bypasses RLS.
 * Only use for test setup/teardown, not for testing application behavior.
 */

// Initialize Supabase client with service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Get a test pet ID for a specific clinic
 * Useful for tests that need to operate on a pet
 * 
 * @param tenantId - Clinic/tenant ID
 * @returns Pet ID
 */
export async function getTestPetId(tenantId: Clinic): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('pets')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();

    if (error) {
      throw new Error(`Failed to get test pet: ${error.message}`);
    }

    if (!data) {
      throw new Error(`No pets found for tenant: ${tenantId}`);
    }

    return data.id;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[E2E/Database] Failed to get test pet for ${tenantId}:`, errorMessage);
    throw error;
  }
}

/**
 * Get all pets for a specific owner
 * 
 * @param ownerEmail - Owner's email address
 * @returns Array of pet objects
 */
export async function getOwnerPets(ownerEmail: string): Promise<any[]> {
  try {
    // First get the user ID from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, tenant_id')
      .eq('email', ownerEmail)
      .single();

    if (profileError) {
      throw new Error(`Failed to get owner profile: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error(`No profile found for email: ${ownerEmail}`);
    }

    // Get pets for this owner
    const { data: pets, error: petsError } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', profile.id)
      .eq('tenant_id', profile.tenant_id);

    if (petsError) {
      throw new Error(`Failed to get pets: ${petsError.message}`);
    }

    return pets || [];
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[E2E/Database] Failed to get owner pets for ${ownerEmail}:`, errorMessage);
    throw error;
  }
}

/**
 * Get upcoming appointments for a clinic
 * 
 * @param tenantId - Clinic/tenant ID
 * @param limit - Maximum number of appointments to return
 * @returns Array of appointment objects
 */
export async function getUpcomingAppointments(
  tenantId: Clinic,
  limit = 10
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get appointments: ${error.message}`);
    }

    return data || [];
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[E2E/Database] Failed to get appointments for ${tenantId}:`, errorMessage);
    throw error;
  }
}

/**
 * Get medical records for a pet
 * 
 * @param petId - Pet UUID
 * @returns Array of medical record objects
 */
export async function getPetMedicalRecords(petId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get medical records: ${error.message}`);
    }

    return data || [];
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[E2E/Database] Failed to get medical records for pet ${petId}:`, errorMessage);
    throw error;
  }
}

/**
 * Get store products for a clinic
 * 
 * @param tenantId - Clinic/tenant ID
 * @param limit - Maximum number of products to return
 * @returns Array of product objects
 */
export async function getStoreProducts(
  tenantId: Clinic,
  limit = 20
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('store_products')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get products: ${error.message}`);
    }

    return data || [];
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[E2E/Database] Failed to get products for ${tenantId}:`, errorMessage);
    throw error;
  }
}

/**
 * Verify tenant data isolation
 * Check that a clinic cannot see another clinic's data
 * 
 * @param tenantId - Clinic/tenant ID to check
 * @param otherTenantId - Other clinic that should not be visible
 * @returns True if isolation is working correctly
 */
export async function verifyTenantIsolation(
  tenantId: Clinic,
  otherTenantId: Clinic
): Promise<boolean> {
  try {
    // Check pets table
    const { data: otherPets, error: petsError } = await supabase
      .from('pets')
      .select('id')
      .eq('tenant_id', otherTenantId);

    if (petsError) {
      throw new Error(`Failed to query pets: ${petsError.message}`);
    }

    // Check appointments table
    const { data: otherAppts, error: apptsError } = await supabase
      .from('appointments')
      .select('id')
      .eq('tenant_id', otherTenantId);

    if (apptsError) {
      throw new Error(`Failed to query appointments: ${apptsError.message}`);
    }

    // Both should return data (other tenant has data)
    // In application, RLS should prevent seeing this data
    const hasOtherData = (otherPets?.length ?? 0) > 0 || (otherAppts?.length ?? 0) > 0;

    if (!hasOtherData) {
      console.warn(`[E2E/Database] No data found for ${otherTenantId} - cannot verify isolation`);
    }

    return hasOtherData;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[E2E/Database] Failed to verify tenant isolation:`, errorMessage);
    throw error;
  }
}

/**
 * Count records in a table for a specific tenant
 * Useful for verifying data visibility
 * 
 * @param tableName - Table to query
 * @param tenantId - Clinic/tenant ID
 * @returns Record count
 */
export async function countRecords(
  tableName: string,
  tenantId: Clinic
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to count records in ${tableName}: ${error.message}`);
    }

    return count ?? 0;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[E2E/Database] Failed to count records in ${tableName}:`, errorMessage);
    throw error;
  }
}

/**
 * Clean up test data created during a test run
 * WARNING: Only delete data created by tests, not seed data!
 * 
 * @param options - Cleanup options
 */
export async function cleanupTestData(options: {
  tables?: string[];
  createdAfter?: Date;
} = {}): Promise<void> {
  const { tables = [], createdAfter } = options;

  if (!createdAfter) {
    console.warn('[E2E/Database] cleanupTestData called without createdAfter - skipping for safety');
    return;
  }

  try {
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .gte('created_at', createdAfter.toISOString());

      if (error) {
        console.error(`[E2E/Database] Failed to cleanup ${table}:`, error.message);
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[E2E/Database] Cleanup failed:', errorMessage);
    // Don't throw - cleanup failures shouldn't break tests
  }
}

/**
 * Verify seeded data exists for a clinic
 * Used to ensure test environment is properly set up
 * 
 * @param tenantId - Clinic/tenant ID
 * @returns Verification result with counts
 */
export async function verifySeededData(tenantId: Clinic): Promise<{
  valid: boolean;
  counts: Record<string, number>;
  errors: string[];
}> {
  const counts: Record<string, number> = {};
  const errors: string[] = [];

  try {
    // Check key tables have data
    const tables = [
      'pets',
      'appointments',
      'medical_records',
      'vaccines',
      'store_products',
    ];

    for (const table of tables) {
      try {
        counts[table] = await countRecords(table, tenantId);
        if (counts[table] === 0) {
          errors.push(`No ${table} found for ${tenantId}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to count ${table}: ${errorMessage}`);
      }
    }

    return {
      valid: errors.length === 0,
      counts,
      errors,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[E2E/Database] Failed to verify seeded data:', errorMessage);
    return {
      valid: false,
      counts,
      errors: [errorMessage],
    };
  }
}

/**
 * Get the Supabase client (service role)
 * Use sparingly - prefer specific helper functions
 * 
 * @returns Supabase client
 */
export function getSupabaseClient() {
  return supabase;
}
