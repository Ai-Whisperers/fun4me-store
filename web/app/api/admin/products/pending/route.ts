import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { pendingProductsQuerySchema } from '@/lib/schemas/admin'

/**
 * GET /api/admin/products/pending
 * List products pending approval for the global catalog
 * This is for platform admins only
 */
export const GET = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryValidation = pendingProductsQuerySchema.safeParse({
      status: searchParams.get('status'),
      search: searchParams.get('search'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    })
    
    if (!queryValidation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { issues: queryValidation.error.issues },
      })
    }
    
    const { status, search, page, limit } = queryValidation.data

    try {
      const offset = (page - 1) * limit

      let query = supabase
        .from('store_products')
        .select(
          `
          *,
          store_categories (id, name, slug),
          store_brands (id, name, slug),
          created_by_tenant:created_by_tenant_id (id, name),
          verified_by_profile:verified_by (id, full_name)
        `,
          { count: 'exact' }
        )
        .is('deleted_at', null)

      // Filter by verification status
      if (status !== 'all') {
        query = query.eq('verification_status', status)
      }

      // Products submitted for global catalog have created_by_tenant_id set
      // or have verification_status != null
      query = query.not('created_by_tenant_id', 'is', null)

      // Apply search filter
      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
      }

      const {
        data: products,
        error,
        count,
      } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

      if (error) throw error

      // Get summary counts
      const { data: summaryData } = await supabase
        .from('store_products')
        .select('verification_status')
        .not('created_by_tenant_id', 'is', null)
        .is('deleted_at', null)

      const summary = {
        pending: 0,
        verified: 0,
        rejected: 0,
        needs_review: 0,
      }

      summaryData?.forEach((p) => {
        const s = p.verification_status || 'pending'
        summary[s as keyof typeof summary] = (summary[s as keyof typeof summary] || 0) + 1
      })

      // Cast the joined data properly
      const enrichedProducts = products?.map((p) => {
        const category = p.store_categories as unknown as {
          id: string
          name: string
          slug: string
        } | null
        const brand = p.store_brands as unknown as { id: string; name: string; slug: string } | null
        const createdByTenant = p.created_by_tenant as unknown as { id: string; name: string } | null
        const verifiedByProfile = p.verified_by_profile as unknown as {
          id: string
          full_name: string
        } | null

        return {
          ...p,
          category,
          brand,
          created_by_tenant: createdByTenant,
          verified_by_profile: verifiedByProfile,
        }
      })

      return NextResponse.json({
        products: enrichedProducts,
        summary,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
          hasNext: page < Math.ceil((count || 0) / limit),
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      logger.error('Error fetching pending products', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'] }
)
