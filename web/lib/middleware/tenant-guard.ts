/**
 * Tenant Guard Middleware
 * 
 * Enforces tenant isolation for API routes by:
 * 1. Verifying user authentication
 * 2. Extracting user's tenant_id from profiles table
 * 3. Passing tenant_id to route handlers
 * 
 * Usage:
 * ```typescript
 * import { withTenantGuard } from '@/lib/middleware/tenant-guard';
 * 
 * export const GET = withTenantGuard(async (request, tenant_id, user_id) => {
 *   const { data } = await supabase
 *     .from('pets')
 *     .select('*')
 *     .eq('tenant_id', tenant_id);  // ← Always filtered by tenant
 *   
 *   return NextResponse.json(data);
 * });
 * ```
 * 
 * @module tenant-guard
 * @sprint 1 (Security Lockdown)
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Handler function type with guaranteed tenant_id
 */
export type TenantGuardHandler = (
  request: NextRequest,
  tenant_id: string,
  user_id: string
) => Promise<Response>;

/**
 * Wraps an API route handler with tenant isolation enforcement
 * 
 * @param handler - Route handler function that receives tenant_id
 * @returns Wrapped handler with authentication and tenant checks
 * 
 * @example
 * ```typescript
 * export const GET = withTenantGuard(async (request, tenant_id, user_id) => {
 *   // tenant_id is guaranteed to exist here
 *   const { data } = await supabase
 *     .from('appointments')
 *     .select('*')
 *     .eq('tenant_id', tenant_id);
 *   
 *   return NextResponse.json(data);
 * });
 * ```
 */
export function withTenantGuard(handler: TenantGuardHandler) {
  return async (request: NextRequest): Promise<Response> => {
    const supabase = await createClient();

    // Step 1: Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.error('[TenantGuard] Authentication failed', {
        error: authError?.message,
      });
      return NextResponse.json(
        { error: 'No autorizado. Por favor inicie sesión.' },
        { status: 401 }
      );
    }

    // Step 2: Get user's tenant_id from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.error('[TenantGuard] Profile lookup failed', {
        error: profileError.message,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Error al obtener perfil de usuario' },
        { status: 500 }
      );
    }

    if (!profile || !profile.tenant_id) {
      logger.warn('[TenantGuard] User has no tenant access', { userId: user.id });
      return NextResponse.json(
        { error: 'Usuario sin acceso a ninguna clínica. Contacte al administrador.' },
        { status: 403 }
      );
    }

    // Step 3: Call handler with guaranteed tenant_id
    try {
      return await handler(request, profile.tenant_id, user.id);
    } catch (error: unknown) {
      logger.error('[TenantGuard] Handler error', {
        error: error instanceof Error ? error.message : String(error),
        tenantId: profile.tenant_id,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  };
}

/**
 * Optional tenant guard that allows access without authentication
 * but adds tenant_id if user is logged in.
 * 
 * Useful for routes that have both public and authenticated behaviors.
 * 
 * @param handler - Route handler that receives optional tenant_id
 * @returns Wrapped handler
 */
export function withOptionalTenantGuard(
  handler: (
    request: NextRequest,
    tenant_id: string | null,
    user_id: string | null
  ) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // No authentication - pass nulls
      return handler(request, null, null);
    }

    // User authenticated - try to get tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    return handler(request, profile?.tenant_id || null, user.id);
  };
}

/**
 * Strict tenant guard for admin-only routes
 * Requires user to have 'admin' role
 */
export function withAdminTenantGuard(handler: TenantGuardHandler) {
  return async (request: NextRequest): Promise<Response> => {
    const supabase = await createClient();

    // Step 1: Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Step 2: Get profile with role check
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 403 }
      );
    }

    // Step 3: Role check
    if (profile.role !== 'admin') {
      logger.warn('[AdminGuard] Unauthorized access attempt', { userId: user.id, role: profile.role });
      return NextResponse.json(
        { error: 'Solo administradores pueden acceder a este recurso' },
        { status: 403 }
      );
    }

    // Step 4: Call handler
    return handler(request, profile.tenant_id, user.id);
  };
}

/**
 * Get tenant_id for current authenticated user
 * Helper function for use outside of route handlers
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  return profile?.tenant_id || null;
}
