import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/dashboard/campaigns/[id]
 * Get a single campaign with its products
 */
export const GET = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const campaignId = params.id

    try {
      const { data: campaign, error } = await supabase
        .from('store_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .single()

      if (error || !campaign) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { message: 'Campaña no encontrada' },
        })
      }

      // Get campaign products
      const { data: campaignItems } = await supabase
        .from('store_campaign_items')
        .select(
          `
          id,
          product_id,
          discount_type,
          discount_value,
          store_products (
            id,
            name,
            sku,
            base_price,
            images
          )
        `
        )
        .eq('campaign_id', campaignId)

      return NextResponse.json({
        campaign,
        products:
          campaignItems?.map((item) => ({
            ...item,
            product: item.store_products,
          })) || [],
      })
    } catch (e) {
      logger.error('Error fetching campaign', {
        tenantId: profile.tenant_id,
        campaignId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * PUT /api/dashboard/campaigns/[id]
 * Update a campaign
 */
export const PUT = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const campaignId = params.id

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
        is_active,
        product_ids,
      } = body

      // Check if campaign exists
      const { data: existing } = await supabase
        .from('store_campaigns')
        .select('id')
        .eq('id', campaignId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .single()

      if (!existing) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'campaign' },
        })
      }

      // Validation
      if (discount_type === 'percentage' && discount_value && (discount_value <= 0 || discount_value > 100)) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'El porcentaje debe estar entre 1 y 100' },
        })
      }

      if (start_date && end_date) {
        const startDateObj = new Date(start_date)
        const endDateObj = new Date(end_date)
        if (endDateObj <= startDateObj) {
          return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
            details: { message: 'La fecha de fin debe ser posterior a la fecha de inicio' },
          })
        }
      }

      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (campaign_type !== undefined) updateData.campaign_type = campaign_type
      if (discount_type !== undefined) updateData.discount_type = discount_type
      if (discount_value !== undefined) updateData.discount_value = discount_value
      if (start_date !== undefined) updateData.start_date = new Date(start_date).toISOString()
      if (end_date !== undefined) updateData.end_date = new Date(end_date).toISOString()
      if (is_active !== undefined) updateData.is_active = is_active

      const { data: campaign, error } = await supabase
        .from('store_campaigns')
        .update(updateData)
        .eq('id', campaignId)
        .eq('tenant_id', profile.tenant_id)
        .select()
        .single()

      if (error) throw error

      // Update products if provided
      if (product_ids !== undefined) {
        // Delete existing items
        await supabase.from('store_campaign_items').delete().eq('campaign_id', campaignId)

        // Add new items
        if (product_ids.length > 0) {
          const campaignItems = product_ids.map((productId: string) => ({
            campaign_id: campaignId,
            tenant_id: profile.tenant_id,
            product_id: productId,
          }))

          await supabase.from('store_campaign_items').insert(campaignItems)
        }
      }

      return NextResponse.json({ campaign })
    } catch (e) {
      logger.error('Error updating campaign', {
        tenantId: profile.tenant_id,
        campaignId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

/**
 * DELETE /api/dashboard/campaigns/[id]
 * Soft delete a campaign
 */
export const DELETE = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const campaignId = params.id

    try {
      const { error } = await supabase
        .from('store_campaigns')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .eq('id', campaignId)
        .eq('tenant_id', profile.tenant_id)

      if (error) throw error

      return NextResponse.json({ success: true })
    } catch (e) {
      logger.error('Error deleting campaign', {
        tenantId: profile.tenant_id,
        campaignId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)
