'use server'

import { db } from '@/db'
import { systemConfigs } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { actionSuccess, actionError } from '@/lib/errors'
import { withActionAuth } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const getSystemConfigs = withActionAuth(
  async ({ profile: _profile }, clinicSlug: string) => {
    try {
      const configs = await db
        .select()
        .from(systemConfigs)
        .where(eq(systemConfigs.tenantId, clinicSlug))

      return actionSuccess(configs)
    } catch (error) {
      logger.error('Failed to fetch system configs', {
        error: error instanceof Error ? error : undefined,
        tenant: clinicSlug,
      })
      return actionError('No se pudieron cargar las configuraciones.')
    }
  },
  { roles: ['admin'] }
)

export const setSystemConfig = withActionAuth(
  async ({ profile }, clinicSlug: string, key: string, value: string, description?: string) => {
    try {
      // Upsert logic
      const existing = await db
        .select()
        .from(systemConfigs)
        .where(and(eq(systemConfigs.tenantId, clinicSlug), eq(systemConfigs.key, key)))
        .limit(1)

      if (existing.length > 0) {
        await db
          .update(systemConfigs)
          .set({ value, description, updatedAt: new Date().toISOString() })
          .where(eq(systemConfigs.id, existing[0].id))
      } else {
        await db.insert(systemConfigs).values({
          tenantId: clinicSlug,
          key,
          value,
          description,
        })
      }

      revalidatePath(`/${clinicSlug}/dashboard/settings`)
      return actionSuccess()
    } catch (error) {
      logger.error('Failed to set system config', {
        error: error instanceof Error ? error : undefined,
        tenant: clinicSlug,
        configKey: key,
      })
      return actionError('No se pudo guardar la configuración.')
    }
  },
  { roles: ['admin'] }
)
