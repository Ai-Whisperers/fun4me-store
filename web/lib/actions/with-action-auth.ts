import { createClient } from '@/lib/supabase/server'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import type { ActionResult, FieldErrors } from '@/lib/types/action-result'
import { logger } from '@/lib/logger'

export interface ActionContext {
  user: { id: string; email?: string }
  profile: { id: string; tenant_id: string; role: string; full_name: string }
  isStaff: boolean
  isAdmin: boolean
  supabase: Awaited<ReturnType<typeof createClient>>
}

type AuthenticatedAction<T, Args extends unknown[]> = (
  context: ActionContext,
  ...args: Args
) => Promise<ActionResult<T>>

interface ActionAuthOptions {
  requireStaff?: boolean
  requireAdmin?: boolean
  tenantId?: string
}

/**
 * Wraps a server action with automatic authentication and authorization.
 * IMPORTANT: The file using this wrapper MUST have 'use server' at the top.
 *
 * Supports both direct calls and useActionState usage:
 * - Direct: action(formData) -> ActionResult
 * - useActionState: action(prevState, formData) -> ActionResult
 */
export function withActionAuth<T = void, Args extends unknown[] = []>(
  action: AuthenticatedAction<T, Args>,
  options: ActionAuthOptions = {}
) {
  // Return function that handles both (formData) and (prevState, formData) signatures
  return async (...rawArgs: unknown[]): Promise<ActionResult<T>> => {
    // Detect if called from useActionState (first arg is prevState, not FormData)
    // useActionState passes (prevState, formData) where prevState is our ActionResult or null
    let args: Args
    if (
      rawArgs.length >= 2 &&
      rawArgs[1] instanceof FormData &&
      (rawArgs[0] === null || (typeof rawArgs[0] === 'object' && rawArgs[0] !== null && 'success' in rawArgs[0]))
    ) {
      // Called from useActionState: (prevState, formData, ...rest)
      args = rawArgs.slice(1) as Args
    } else {
      // Direct call: (formData, ...rest)
      args = rawArgs as Args
    }
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'No autorizado' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, tenant_id, role, full_name')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'Perfil no encontrado' }
    }

    const isStaff = ['vet', 'admin'].includes(profile.role)
    const isAdmin = profile.role === 'admin'

    if (options.requireStaff && !isStaff) {
      return { success: false, error: 'Acceso denegado' }
    }

    if (options.requireAdmin && !isAdmin) {
      return { success: false, error: 'Acceso denegado' }
    }

    if (options.tenantId && profile.tenant_id !== options.tenantId) {
      return { success: false, error: 'Acceso denegado' }
    }

    try {
      return await action({ user, profile, isStaff, isAdmin, supabase }, ...args)
    } catch (error: unknown) {
      // Re-throw Next.js redirect errors - they're not actual errors
      if (isRedirectError(error)) {
        throw error
      }
      // BUG-006: Use structured logger instead of console.error
      logger.error('Server action failed', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      })
      return { success: false, error: 'Error interno' }
    }
  }
}

export type { ActionResult, FieldErrors }
