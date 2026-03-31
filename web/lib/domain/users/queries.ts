/**
 * User Domain - Specialized Query Functions
 * 
 * Standalone query functions for complex or specialized operations
 * that don't fit the standard repository pattern
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { UserStats, UserProfile, UserWithMetadata } from './types';

// =============================================================================
// USER STATISTICS
// =============================================================================

/**
 * Get aggregated statistics about users in a tenant
 * 
 * @param tenantId - Tenant ID
 * @param supabase - Authenticated Supabase client
 * @returns User statistics aggregated by role and activity
 */
export async function getUserStats(
  tenantId: string,
  supabase: SupabaseClient
): Promise<UserStats> {
  try {
    // Fetch all active users with their role and metadata
    const { data: users, error } = await supabase
      .from('profiles')
      .select('role, created_at')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (error) {
      console.error('[getUserStats] Query failed:', { tenantId, error });
      throw error;
    }

    const allUsers = users || [];

    // Calculate date 30 days ago for recent signups
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentThreshold = thirtyDaysAgo.toISOString();

    // Aggregate statistics
    const stats: UserStats = {
      total: allUsers.length,
      by_role: {
        owner: allUsers.filter(u => u.role === 'owner').length,
        vet: allUsers.filter(u => u.role === 'vet').length,
        admin: allUsers.filter(u => u.role === 'admin').length,
      },
      staff_count: allUsers.filter(u => u.role === 'vet' || u.role === 'admin').length,
      active_owners: 0, // Will be calculated below
      owners_with_pets: 0, // Will be calculated below
      recent_signups: allUsers.filter(u => u.created_at >= recentThreshold).length,
    };

    // Get active owners (owners who have appointments in last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const activeThreshold = ninetyDaysAgo.toISOString();

    const { data: activeOwnerIds } = await supabase
      .from('appointments')
      .select('owner_id')
      .eq('tenant_id', tenantId)
      .gte('start_time', activeThreshold);

    if (activeOwnerIds) {
      const uniqueActiveOwners = new Set(activeOwnerIds.map(a => a.owner_id));
      stats.active_owners = uniqueActiveOwners.size;
    }

    // Get owners with pets
    const { data: ownerIdsWithPets } = await supabase
      .from('pets')
      .select('owner_id')
      .eq('tenant_id', tenantId)
      .not('owner_id', 'is', null);

    if (ownerIdsWithPets) {
      const uniqueOwnersWithPets = new Set(ownerIdsWithPets.map(p => p.owner_id));
      stats.owners_with_pets = uniqueOwnersWithPets.size;
    }

    return stats;
  } catch (error) {
    console.error('[getUserStats] Failed:', { tenantId, error });
    throw error;
  }
}

// =============================================================================
// ENRICHED USER QUERIES
// =============================================================================

/**
 * Get pet owners with additional metadata (pet count, appointment count)
 * 
 * @param tenantId - Tenant ID
 * @param supabase - Authenticated Supabase client
 * @returns List of owners with metadata
 */
export async function getUsersWithPets(
  tenantId: string,
  supabase: SupabaseClient
): Promise<UserWithMetadata[]> {
  try {
    // Get all owners
    const { data: owners, error: ownersError } = await supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('role', 'owner')
      .is('deleted_at', null)
      .order('full_name');

    if (ownersError) {
      console.error('[getUsersWithPets] Owner query failed:', { tenantId, error: ownersError });
      throw ownersError;
    }

    if (!owners || owners.length === 0) {
      return [];
    }

    const ownerIds = owners.map(o => o.id);

    // Get pet counts for all owners
    const { data: petCounts, error: petsError } = await supabase
      .from('pets')
      .select('owner_id')
      .eq('tenant_id', tenantId)
      .in('owner_id', ownerIds);

    if (petsError) {
      console.error('[getUsersWithPets] Pet count query failed:', { tenantId, error: petsError });
      throw petsError;
    }

    // Get appointment counts and last visit
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('owner_id, start_time')
      .eq('tenant_id', tenantId)
      .in('owner_id', ownerIds)
      .order('start_time', { ascending: false });

    if (appointmentsError) {
      console.error('[getUsersWithPets] Appointment query failed:', { tenantId, error: appointmentsError });
      throw appointmentsError;
    }

    // Build metadata maps
    const petCountMap = new Map<string, number>();
    if (petCounts) {
      petCounts.forEach(p => {
        const count = petCountMap.get(p.owner_id) || 0;
        petCountMap.set(p.owner_id, count + 1);
      });
    }

    const appointmentCountMap = new Map<string, number>();
    const lastVisitMap = new Map<string, string>();
    if (appointments) {
      appointments.forEach(a => {
        // Count appointments
        const count = appointmentCountMap.get(a.owner_id) || 0;
        appointmentCountMap.set(a.owner_id, count + 1);

        // Track most recent visit
        if (!lastVisitMap.has(a.owner_id)) {
          lastVisitMap.set(a.owner_id, a.start_time);
        }
      });
    }

    // Combine data
    const usersWithMetadata: UserWithMetadata[] = owners.map(owner => ({
      ...owner,
      pet_count: petCountMap.get(owner.id) || 0,
      appointment_count: appointmentCountMap.get(owner.id) || 0,
      last_visit: lastVisitMap.get(owner.id) || null,
    }));

    return usersWithMetadata;
  } catch (error) {
    console.error('[getUsersWithPets] Failed:', { tenantId, error });
    throw error;
  }
}

// =============================================================================
// ACTIVITY QUERIES
// =============================================================================

/**
 * Get users who have logged in recently
 * 
 * @param tenantId - Tenant ID
 * @param days - Number of days to look back (default: 30)
 * @param supabase - Authenticated Supabase client
 * @returns List of recently active users
 */
export async function getRecentlyActive(
  tenantId: string,
  days: number = 30,
  supabase: SupabaseClient
): Promise<UserProfile[]> {
  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffIso = cutoffDate.toISOString();

    // Query users with recent activity
    // Note: Supabase Auth tracks last_sign_in_at in auth.users, not profiles
    // We'll use created_at as a proxy for now, or join with auth.users if needed
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('updated_at', cutoffIso) // Use updated_at as proxy for activity
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[getRecentlyActive] Query failed:', { tenantId, days, error });
      throw error;
    }

    return users || [];
  } catch (error) {
    console.error('[getRecentlyActive] Failed:', { tenantId, days, error });
    throw error;
  }
}

// =============================================================================
// OWNER-SPECIFIC QUERIES
// =============================================================================

/**
 * Get owners without any pets (potential onboarding targets)
 * 
 * @param tenantId - Tenant ID
 * @param supabase - Authenticated Supabase client
 * @returns List of owners without pets
 */
export async function getOwnersWithoutPets(
  tenantId: string,
  supabase: SupabaseClient
): Promise<UserProfile[]> {
  try {
    // Get all owner IDs
    const { data: allOwners, error: ownersError } = await supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('role', 'owner')
      .is('deleted_at', null);

    if (ownersError) {
      console.error('[getOwnersWithoutPets] Owner query failed:', { tenantId, error: ownersError });
      throw ownersError;
    }

    if (!allOwners || allOwners.length === 0) {
      return [];
    }

    // Get owners who have pets
    const { data: ownersWithPets, error: petsError } = await supabase
      .from('pets')
      .select('owner_id')
      .eq('tenant_id', tenantId);

    if (petsError) {
      console.error('[getOwnersWithoutPets] Pet query failed:', { tenantId, error: petsError });
      throw petsError;
    }

    const ownerIdsWithPets = new Set(
      (ownersWithPets || []).map(p => p.owner_id)
    );

    // Filter to owners without pets
    const ownersWithoutPets = allOwners.filter(
      owner => !ownerIdsWithPets.has(owner.id)
    );

    return ownersWithoutPets;
  } catch (error) {
    console.error('[getOwnersWithoutPets] Failed:', { tenantId, error });
    throw error;
  }
}
