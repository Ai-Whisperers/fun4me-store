/**
 * Unified server action wrapper with centralized authentication
 * Replaces the old withActionAuth wrapper with improved consistency
 */

import { AuthService } from './core'
import { actionError } from '@/lib/actions/result'
import { logger } from '@/lib/logger'
import type { ActionResult } from '@/lib/types/action-result'
import type { AuthContext, UserRole } from './types'

export interface ActionOptions {
  roles?: UserRole[]
  requireTenant?: boolean
  tenantId?: string
  requireActive?: boolean
}

type ActionHandler<T, Args extends unknown[]> = (
  context: AuthContext,
  ...args: Args
) => Promise<ActionResult<T>>

/**
 * Enhanced server action wrapper with centralized authentication
 *
 * @example
 * ```typescript
 * export const createAppointment = withActionAuth(
 *   async ({ profile, supabase }, appointmentData) => {
 *     // Business logic here
 *     return actionSuccess(result)
 *   },
 *   { roles: ['vet', 'admin'] }
 * )
 * ```
 */
export function withActionAuth<T = void, Args extends unknown[] = []>(
  handler: ActionHandler<T, Args>,
  options: ActionOptions = {}
) {
  return async (...args: Args): Promise<ActionResult<T>> => {
    try {
      // Validate authentication
      const authResult = await AuthService.validateAuth(options)

      if (!authResult.success || !authResult.context) {
        return actionError(authResult.error?.message || 'No autorizado')
      }

      // Execute handler
      return await handler(authResult.context, ...args)
    } catch (error: unknown) {
      logger.error('[Action] Execution error', {
        error: error instanceof Error ? error.message : String(error),
        action: 'server_action.error',
      })
      return actionError('Error interno del servidor')
    }
  }
}

// Re-export from core
export { requireOwnership } from './core'

/**
 * Utility function to check tenant access within actions
 */
export function requireTenantAccess(tenantId: string, context: AuthContext): boolean {
  return (
    AuthService.belongsToTenant(context.profile, tenantId) || AuthService.isAdmin(context.profile)
  )
}

/**
 * Create a tenant-scoped query builder
 */
export function createTenantQuery(context: AuthContext) {
  return {
    select: (table: string) =>
      context.supabase.from(table).select('*').eq('tenant_id', context.profile.tenant_id),
    insert: <T extends Record<string, unknown>>(table: string, data: T) =>
      context.supabase.from(table).insert({ ...data, tenant_id: context.profile.tenant_id }),
    update: <T extends Record<string, unknown>>(table: string, data: T) =>
      context.supabase.from(table).update(data).eq('tenant_id', context.profile.tenant_id),
    delete: (table: string) =>
      context.supabase.from(table).delete().eq('tenant_id', context.profile.tenant_id),
  }
}
