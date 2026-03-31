import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, apiSuccess, validationError, HTTP_STATUS } from '@/lib/api/errors'
import { generalSettingsSchema } from '@/lib/schemas/settings'
import { logger } from '@/lib/logger'
import * as fs from 'fs/promises'
import * as path from 'path'

const CONTENT_DATA_PATH = path.join(process.cwd(), '.content_data')

export const GET = withApiAuth(
  async ({ request, profile }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const clinic = searchParams.get('clinic')

    if (!clinic) {
      return apiError('MISSING_FIELDS', 400, { details: { message: 'Clinic parameter required' } })
    }

    // Admin check (already verified by withAuth roles if passed, but here we check tenant)
    if (profile.role !== 'admin' || profile.tenant_id !== clinic) {
      return apiError('FORBIDDEN', 403)
    }

    try {
      // Read config.json
      const configPath = path.join(CONTENT_DATA_PATH, clinic, 'config.json')
      const configData = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(configData)

      return apiSuccess({
        name: config.name || '',
        tagline: config.tagline || '',
        contact: config.contact || {},
        hours: config.hours || {},
        settings: {
          currency: config.settings?.currency || 'PYG',
          emergency_24h: config.settings?.emergency_24h || false,
        },
      })
    } catch (error) {
      logger.error('Error reading config', {
        tenantId: profile.tenant_id,
        clinic,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al leer configuración' },
      })
    }
  },
  { roles: ['admin'] }
)

export const PUT = withApiAuth(
  async ({ request, profile }: ApiHandlerContext) => {
    let body: unknown
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', 400)
    }

    // Validate with Zod
    const validation = generalSettingsSchema.safeParse(body)
    if (!validation.success) {
      return validationError(validation.error.flatten().fieldErrors)
    }

    const { clinic, ...settings } = validation.data

    // Admin check
    if (profile.role !== 'admin' || profile.tenant_id !== clinic) {
      return apiError('FORBIDDEN', 403)
    }

    try {
      // Read existing config
      const configPath = path.join(CONTENT_DATA_PATH, clinic, 'config.json')
      const configData = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(configData)

      // Update fields
      const updatedConfig = {
        ...config,
        name: settings.name || config.name,
        tagline: settings.tagline || config.tagline,
        contact: {
          ...config.contact,
          ...settings.contact,
        },
        hours: {
          ...config.hours,
          ...settings.hours,
        },
        settings: {
          ...config.settings,
          currency: settings.settings?.currency || config.settings?.currency,
          emergency_24h: settings.settings?.emergency_24h ?? config.settings?.emergency_24h,
        },
      }

      // Write back
      await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2), 'utf-8')

      return apiSuccess({ success: true })
    } catch (error) {
      logger.error('Error updating config', {
        tenantId: profile.tenant_id,
        clinic,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al guardar configuración' },
      })
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
