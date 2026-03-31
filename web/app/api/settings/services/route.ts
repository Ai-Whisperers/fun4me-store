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
      // Read services.json
      const servicesPath = path.join(CONTENT_DATA_PATH, clinic, 'services.json')
      const servicesData = await fs.readFile(servicesPath, 'utf-8')
      const services = JSON.parse(servicesData)

      return apiSuccess(services)
    } catch (error) {
      logger.error('Error reading services', {
        tenantId: profile.tenant_id,
        clinic,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al leer servicios' },
      })
    }
  },
  { roles: ['vet', 'admin'] }
)

export const PUT = withApiAuth(
  async ({ request, profile }: ApiHandlerContext) => {
    let body: unknown
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const { clinic, services } = body as {
      clinic?: string
      services?: unknown[]
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
      // Read existing services to preserve meta
      const servicesPath = path.join(CONTENT_DATA_PATH, clinic, 'services.json')
      const existingData = await fs.readFile(servicesPath, 'utf-8')
      const existing = JSON.parse(existingData)

      // Update services while preserving meta
      const updatedServices = {
        meta: existing.meta,
        services: services,
      }

      // Write back
      await fs.writeFile(servicesPath, JSON.stringify(updatedServices, null, 2), 'utf-8')

      return apiSuccess({ success: true })
    } catch (error) {
      logger.error('Error updating services', {
        tenantId: profile.tenant_id,
        clinic,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al guardar servicios' },
      })
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
