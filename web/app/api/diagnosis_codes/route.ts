import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

export const GET = withApiAuth(
  async ({ request, user: _user, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json([])
    }

    // Use websearch text search if available, or ILIKE
    const { data, error } = await supabase
      .from('diagnosis_codes')
      .select('id, code, term, category, species, description, created_at')
      .ilike('term', `%${query}%`)
      .is('deleted_at', null)
      .limit(10)

    if (error) {
      logger.error('Error searching diagnosis codes', {
        tenantId: profile.tenant_id,
        query,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  },
  { roles: ['vet', 'admin'], rateLimit: 'search' }
)
