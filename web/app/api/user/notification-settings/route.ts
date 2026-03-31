import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { notificationSettingsSchema } from '@/lib/schemas/notification'

/**
 * GET /api/user/notification-settings - Get user's notification preferences
 */
export const GET = withApiAuth(async ({ user, profile: _profile, supabase }: ApiHandlerContext) => {
  // Get user's communication preferences
  const { data: prefs, error } = await supabase
    .from('communication_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  // Map to UI format (defaults if no record exists)
  const settings = {
    email_vaccine_reminders: prefs?.allow_vaccine_reminders ?? true,
    email_appointment_reminders: prefs?.allow_appointment_reminders ?? true,
    email_promotions: prefs?.allow_marketing ?? false,
    sms_vaccine_reminders: prefs?.allow_sms ?? false,
    sms_appointment_reminders: prefs?.allow_sms ?? true,
    whatsapp_enabled: prefs?.allow_whatsapp ?? true,
  }

  return NextResponse.json(settings)
})

/**
 * POST /api/user/notification-settings - Update user's notification preferences
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  const body = await request.json()
  
  // Validate input with Zod schema
  const validation = notificationSettingsSchema.safeParse(body)
  if (!validation.success) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      details: { issues: validation.error.issues },
    })
  }
  
  const { settings } = validation.data

  // Map from UI format to DB format
  const prefsData = {
    user_id: user.id,
    tenant_id: profile.tenant_id || null,
    allow_email: settings.email_vaccine_reminders || settings.email_appointment_reminders,
    allow_sms: settings.sms_vaccine_reminders || settings.sms_appointment_reminders,
    allow_whatsapp: settings.whatsapp_enabled,
    allow_appointment_reminders: settings.email_appointment_reminders || settings.sms_appointment_reminders,
    allow_vaccine_reminders: settings.email_vaccine_reminders || settings.sms_vaccine_reminders,
    allow_marketing: settings.email_promotions,
    updated_at: new Date().toISOString(),
  }

  // Upsert preferences
  const { error } = await supabase.from('communication_preferences').upsert(prefsData, {
    onConflict: 'user_id,tenant_id',
  })

  if (error) {
    logger.error('Error saving notification settings', {
      userId: user.id,
      tenantId: profile.tenant_id,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return NextResponse.json({ success: true })
  },
  { rateLimit: 'write' }
)
