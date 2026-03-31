import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/dashboard/alert-preferences
 * Get current user's alert preferences
 */
export const GET = withApiAuth(
  async ({ user, profile, supabase }: ApiHandlerContext) => {
    try {
      // Get user's preferences
      let { data: preferences } = await supabase
        .from('staff_alert_preferences')
        .select('*')
        .eq('profile_id', user.id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      // If no preferences exist, return defaults
      if (!preferences) {
        preferences = {
          id: null,
          profile_id: user.id,
          tenant_id: profile.tenant_id,
          low_stock_alerts: true,
          expiry_alerts: true,
          out_of_stock_alerts: true,
          email_enabled: true,
          whatsapp_enabled: false,
          in_app_enabled: true,
          low_stock_threshold: 5,
          expiry_days_warning: 30,
          notification_email: null,
          notification_phone: null,
          digest_frequency: 'immediate',
          last_digest_sent_at: null,
        }
      }

      return NextResponse.json({ preferences })
    } catch (e) {
      logger.error('Error fetching alert preferences', {
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
 * POST /api/dashboard/alert-preferences
 * Create or update alert preferences
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      const body = await request.json()

      const preferences = {
        profile_id: user.id,
        tenant_id: profile.tenant_id,
        low_stock_alerts: body.low_stock_alerts ?? true,
        expiry_alerts: body.expiry_alerts ?? true,
        out_of_stock_alerts: body.out_of_stock_alerts ?? true,
        email_enabled: body.email_enabled ?? true,
        whatsapp_enabled: body.whatsapp_enabled ?? false,
        in_app_enabled: body.in_app_enabled ?? true,
        low_stock_threshold: body.low_stock_threshold ?? 5,
        expiry_days_warning: body.expiry_days_warning ?? 30,
        notification_email: body.notification_email || null,
        notification_phone: body.notification_phone || null,
        digest_frequency: body.digest_frequency || 'immediate',
      }

      // Validate digest_frequency
      if (!['immediate', 'daily', 'weekly'].includes(preferences.digest_frequency)) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'Frecuencia de resumen inválida' },
        })
      }

      // Upsert preferences
      const { data, error } = await supabase
        .from('staff_alert_preferences')
        .upsert(preferences, {
          onConflict: 'profile_id,tenant_id',
        })
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({
        success: true,
        preferences: data,
        message: 'Preferencias guardadas correctamente',
      })
    } catch (e) {
      logger.error('Error saving alert preferences', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

/**
 * DELETE /api/dashboard/alert-preferences
 * Delete alert preferences (reset to defaults)
 */
export const DELETE = withApiAuth(
  async ({ user, profile, supabase }: ApiHandlerContext) => {
  try {
    await supabase
      .from('staff_alert_preferences')
      .delete()
      .eq('profile_id', user.id)
      .eq('tenant_id', profile.tenant_id)

    return NextResponse.json({
      success: true,
      message: 'Preferencias restablecidas a valores predeterminados',
    })
  } catch (e) {
    logger.error('Error deleting alert preferences', {
      tenantId: profile.tenant_id,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
