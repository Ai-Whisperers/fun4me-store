import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, apiSuccess, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * Public endpoint - no authentication required
 * Returns available services for a clinic
 *
 * @param clinic - Clinic slug (required)
 * @param category - Optional category filter
 * @param active - Filter active services (default: true)
 *
 * Cache: 5 minutes (s-maxage=300)
 */
import { rateLimit } from '@/lib/rate-limit'

/**
 * Public endpoint - no authentication required
 * Returns available services for a clinic
 *
 * @param clinic - Clinic slug (required)
 * @param category - Optional category filter
 * @param active - Filter active services (default: true)
 *
 * Cache: 5 minutes (s-maxage=300)
 */
export async function GET(request: Request) {
  // Apply mild rate limiting for public scraping protection (30 requests per minute)
  const rateLimitResult = await rateLimit(request as NextRequest, 'search', 'public-services')
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  const supabase = await createClient()

  const { searchParams } = new URL(request.url)
  const clinic = searchParams.get('clinic')
  const category = searchParams.get('category')
  const active = searchParams.get('active') !== 'false' // Default to active only

  if (!clinic) {
    return apiError('MISSING_FIELDS', 400, { details: { field: 'clinic' } })
  }

  try {
    let query = supabase
      .from('services')
      .select(
        'id, tenant_id, name, description, category, base_price, duration_minutes, is_active, created_at, updated_at'
      )
      .eq('tenant_id', clinic)
      .is('deleted_at', null)
      .order('category')
      .order('name')

    if (active) {
      query = query.eq('is_active', true)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data: services, error } = await query

    if (error) throw error

    return NextResponse.json(services, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (e) {
    logger.error('Error loading services', {
      clinic,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

// POST /api/services - Create service (staff only)
export const POST = withApiAuth(
  async ({ profile, supabase, request }: ApiHandlerContext) => {
    try {
      const body = await request.json()
      const { name, description, category, base_price, duration_minutes, is_active } = body

      if (!name || !category || base_price === undefined) {
        return apiError('MISSING_FIELDS', 400, {
          details: { required: ['name', 'category', 'base_price'] },
        })
      }

      const { data: service, error } = await supabase
        .from('services')
        .insert({
          tenant_id: profile.tenant_id,
          name,
          description,
          category,
          base_price,
          duration_minutes: duration_minutes || 30,
          is_active: is_active !== false,
        })
        .select()
        .single()

      if (error) throw error

      const { logAudit } = await import('@/lib/audit')
      await logAudit('CREATE_SERVICE', `services/${service.id}`, { name, category, base_price })

      return apiSuccess(service, 'Servicio creado exitosamente', 201)
    } catch (e) {
      logger.error('Error creating service', {
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
