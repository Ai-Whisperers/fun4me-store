import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, apiSuccess, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import * as fs from 'fs/promises'
import * as path from 'path'

const CONTENT_DATA_PATH = path.join(process.cwd(), '.content_data')

export const GET = withApiAuth(
  async ({ request, profile }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const clinic = searchParams.get('clinic')

    if (!clinic) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Clinic parameter required' },
      })
    }

    // Verify tenant match
    if (profile.tenant_id !== clinic) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    try {
      // Read config.json
      const configPath = path.join(CONTENT_DATA_PATH, clinic, 'config.json')
      const configData = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(configData)

      return apiSuccess({
        modules: config.settings?.modules || {},
      })
    } catch (error) {
      logger.error('Error reading modules', {
        tenantId: profile.tenant_id,
        clinic,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al leer módulos' },
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
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const { clinic, modules } = body as {
      clinic?: string
      modules?: Record<string, boolean>
    }

    if (!clinic) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Clinic parameter required' },
      })
    }

    // Verify tenant match
    if (profile.tenant_id !== clinic) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    try {
      // Read existing config
      const configPath = path.join(CONTENT_DATA_PATH, clinic, 'config.json')
      const configData = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(configData)

      // Update modules
      const updatedConfig = {
        ...config,
        settings: {
          ...config.settings,
          modules: {
            ...config.settings?.modules,
            ...modules,
          },
        },
      }

      // Write back
      await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2), 'utf-8')

      return apiSuccess({ success: true })
    } catch (error) {
      logger.error('Error updating modules', {
        tenantId: profile.tenant_id,
        clinic,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al guardar módulos' },
      })
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
