import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

export type CampaignType = 'sale' | 'bogo' | 'bundle' | 'flash' | 'seasonal'
export type CampaignDiscountType = 'percentage' | 'fixed_amount'

interface Campaign {
  id: string
  tenant_id: string
  name: string
  description: string | null
  campaign_type: CampaignType
  discount_type: CampaignDiscountType
  discount_value: number
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

function getCampaignStatus(campaign: Campaign, now: string): string {
  if (!campaign.is_active) return 'inactive'
  if (campaign.end_date < now) return 'ended'
  if (campaign.start_date > now) return 'scheduled'
  return 'active'
}

/**
 * GET /api/dashboard/campaigns
 * List all campaigns for the clinic
 */
export const GET = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all' // all, active, scheduled, ended
    const type = searchParams.get('type') || 'all'
    const month = searchParams.get('month') // YYYY-MM format for calendar view
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    try {
      const offset = (page - 1) * limit
      const now = new Date().toISOString()

      let query = supabase
        .from('store_campaigns')
        .select('*', { count: 'exact' })
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)

      // Apply status filter
      if (status === 'active') {
        query = query.eq('is_active', true).lte('start_date', now).gte('end_date', now)
      } else if (status === 'scheduled') {
        query = query.gt('start_date', now)
      } else if (status === 'ended') {
        query = query.lt('end_date', now)
      } else if (status === 'inactive') {
        query = query.eq('is_active', false)
      }

      // Apply type filter
      if (type !== 'all') {
        query = query.eq('campaign_type', type)
      }

      // Apply month filter for calendar view
      if (month) {
        const [year, monthNum] = month.split('-').map(Number)
        const startOfMonth = new Date(year, monthNum - 1, 1).toISOString()
        const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59).toISOString()

        // Get campaigns that overlap with the month
        query = query.lte('start_date', endOfMonth).gte('end_date', startOfMonth)
      }

      const {
        data: campaigns,
        error,
        count,
      } = await query.order('start_date', { ascending: false }).range(offset, offset + limit - 1)

      if (error) throw error

      // Get product counts for each campaign
      const campaignIds = campaigns?.map((c) => c.id) || []
      const { data: itemCounts } = await supabase
        .from('store_campaign_items')
        .select('campaign_id')
        .in('campaign_id', campaignIds)

      const countMap = new Map<string, number>()
      itemCounts?.forEach((item) => {
        countMap.set(item.campaign_id, (countMap.get(item.campaign_id) || 0) + 1)
      })

      const enrichedCampaigns = campaigns?.map((campaign) => ({
        ...campaign,
        product_count: countMap.get(campaign.id) || 0,
        status: getCampaignStatus(campaign as Campaign, now),
      }))

      return NextResponse.json({
        campaigns: enrichedCampaigns,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
          hasNext: page < Math.ceil((count || 0) / limit),
          hasPrev: page > 1,
        },
      })
    } catch (e) {
      logger.error('Error fetching campaigns', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * POST /api/dashboard/campaigns
 * Create a new campaign
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      const body = await request.json()
      const {
        name,
        description,
        campaign_type,
        discount_type,
        discount_value,
        start_date,
        end_date,
        is_active = true,
        product_ids = [],
      } = body

      // Validation
      if (!name || !campaign_type || !discount_type || !discount_value || !start_date || !end_date) {
        return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'Nombre, tipo, descuento, y fechas son requeridos' },
        })
      }

      const validTypes = ['sale', 'bogo', 'bundle', 'flash', 'seasonal']
      if (!validTypes.includes(campaign_type)) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'Tipo de campaña inválido' },
        })
      }

      if (!['percentage', 'fixed_amount'].includes(discount_type)) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'Tipo de descuento inválido' },
        })
      }

      if (discount_type === 'percentage' && (discount_value <= 0 || discount_value > 100)) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'El porcentaje debe estar entre 1 y 100' },
        })
      }

      const startDateObj = new Date(start_date)
      const endDateObj = new Date(end_date)
      if (endDateObj <= startDateObj) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'La fecha de fin debe ser posterior a la fecha de inicio' },
        })
      }

      // Create campaign
      const { data: campaign, error } = await supabase
        .from('store_campaigns')
        .insert({
          tenant_id: profile.tenant_id,
          name,
          description,
          campaign_type,
          discount_type,
          discount_value,
          start_date: startDateObj.toISOString(),
          end_date: endDateObj.toISOString(),
          is_active,
        })
        .select()
        .single()

      if (error) throw error

      // Add products to campaign if provided
      if (product_ids.length > 0) {
        const campaignItems = product_ids.map((productId: string) => ({
          campaign_id: campaign.id,
          tenant_id: profile.tenant_id,
          product_id: productId,
        }))

        const { error: itemsError } = await supabase.from('store_campaign_items').insert(campaignItems)

        if (itemsError) {
          logger.error('Error adding campaign items', {
            campaignId: campaign.id,
            tenantId: profile.tenant_id,
            productIds: product_ids,
            error: itemsError.message,
          })
          // Rollback: delete the campaign since items failed
          await supabase.from('store_campaigns').delete().eq('id', campaign.id)
          return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
            details: { message: 'Error al agregar productos a la campaña' },
          })
        }
      }

      return NextResponse.json({ campaign }, { status: 201 })
    } catch (e) {
      logger.error('Error creating campaign', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
