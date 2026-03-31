import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

export const GET = withApiAuth(
  async ({ request, user: _user, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const species = searchParams.get('species')
    const search = searchParams.get('q')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200)
    const offset = (page - 1) * limit

    let query = supabase
      .from('drug_dosages')
      .select(
        'id, name, species, dose_mg_per_kg, route, frequency, contraindications, notes, created_at, updated_at',
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order('name')

    if (species) {
      query = query.or(`species.eq.${species},species.eq.all`)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      logger.error('Error fetching drug dosages', {
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(
      {
        data,
        total: count || 0,
        page,
        limit,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  },
  { roles: ['vet', 'admin'], rateLimit: 'search' }
)
