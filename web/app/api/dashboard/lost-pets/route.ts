/**
 * API Route: /api/dashboard/lost-pets
 * Handles lost pet reports for the staff dashboard
 *
 * @FEAT-015 Lost Pet Management Dashboard
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { DATABASE_ERRORS } from '@/lib/i18n/errors'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/lost-pets
 * List lost pet reports for the clinic
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase, log }: ApiHandlerContext) => {
    try {
      const { searchParams } = new URL(request.url)
      const clinic = searchParams.get('clinic') || profile.tenant_id
      const page = parseInt(searchParams.get('page') || '1', 10)
      const limit = parseInt(searchParams.get('limit') || '20', 10)
      const status = searchParams.get('status')
      const search = searchParams.get('search')

      // Verify tenant access
      if (clinic !== profile.tenant_id) {
        log.warn('Tenant access denied', { requestedTenant: clinic, userTenant: profile.tenant_id })
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
      }

      // Build base query
      let query = supabase
        .from('lost_pets')
        .select(
          `
          *,
          pet:pets!inner (
            id,
            name,
            species,
            breed,
            photo_url,
            owner:profiles!pets_owner_id_fkey (
              id,
              full_name,
              phone,
              email
            )
          )
        `,
          { count: 'exact' }
        )
        .eq('tenant_id', clinic)
        .order('created_at', { ascending: false })

      // Apply status filter
      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      // Apply search filter
      if (search) {
        // Search in pet name or owner name
        query = query.or(`pet.name.ilike.%${search}%,pet.owner.full_name.ilike.%${search}%`)
      }

      // Apply pagination
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)

      const { data: reports, error, count } = await query

      if (error) {
        log.error('Failed to fetch lost pets', { error, tenant: clinic })
        return NextResponse.json(
          { error: DATABASE_ERRORS.QUERY_FAILED },
          { status: 500 }
        )
      }

      // Get summary counts
      const [lostCount, foundCount, reunitedCount] = await Promise.all([
        supabase
          .from('lost_pets')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', clinic)
          .eq('status', 'lost'),
        supabase
          .from('lost_pets')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', clinic)
          .eq('status', 'found'),
        supabase
          .from('lost_pets')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', clinic)
          .eq('status', 'reunited'),
      ])

      const total = count || 0
      const pages = Math.ceil(total / limit)

      return NextResponse.json({
        reports: reports || [],
        summary: {
          lost: lostCount.count || 0,
          found: foundCount.count || 0,
          reunited: reunitedCount.count || 0,
          total: (lostCount.count || 0) + (foundCount.count || 0) + (reunitedCount.count || 0),
        },
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
      })
    } catch (err) {
      log.error('Error in lost pets API', { error: err instanceof Error ? err.message : err })
      return NextResponse.json(
        { error: DATABASE_ERRORS.SERVER_ERROR },
        { status: 500 }
      )
    }
  },
  { roles: ['vet', 'admin'] }
)
