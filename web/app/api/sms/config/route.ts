import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/sms/config
 * Get SMS configuration status (masked)
 */
export const GET = withApiAuth(
  async ({ user, profile, supabase }: ApiHandlerContext) => {
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('config')
        .eq('id', profile.tenant_id)
        .single()

      const config = tenant?.config || {}

      // Return masked configuration
      return NextResponse.json({
        configured: !!(config.sms_api_key && config.sms_api_secret && config.sms_from),
        provider: 'twilio',
        from_number: config.sms_from ? maskPhone(config.sms_from) : null,
        api_key_set: !!config.sms_api_key,
        api_secret_set: !!config.sms_api_secret,
      })
    } catch (e) {
      logger.error('Error fetching SMS config', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'] }
)

/**
 * POST /api/sms/config
 * Update SMS configuration
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      const body = await request.json()
      const { sms_api_key, sms_api_secret, sms_from } = body

      // Get current tenant config
      const { data: tenant } = await supabase
        .from('tenants')
        .select('config')
        .eq('id', profile.tenant_id)
        .single()

      const currentConfig = tenant?.config || {}

      // Build updated config
      const updatedConfig = {
        ...currentConfig,
        ...(sms_api_key && { sms_api_key }),
        ...(sms_api_secret && { sms_api_secret }),
        ...(sms_from && { sms_from }),
      }

      // Update tenant config
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ config: updatedConfig })
        .eq('id', profile.tenant_id)

      if (updateError) throw updateError

      // Test the configuration if all fields provided
      if (sms_api_key && sms_api_secret && sms_from) {
        const testResult = await testTwilioConfig(sms_api_key, sms_api_secret)
        if (!testResult.success) {
          return NextResponse.json({
            success: true,
            warning: `Configuración guardada pero la prueba falló: ${testResult.error}`,
          })
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Configuración de SMS actualizada',
      })
    } catch (e) {
      logger.error('Error updating SMS config', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)

/**
 * PUT /api/sms/config
 * Test SMS configuration by sending a test message
 */
export const PUT = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      const body = await request.json()
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single()

      const testPhone = body.test_phone || userProfile?.phone

      if (!testPhone) {
        return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
          details: { field: 'test_phone' },
        })
      }

      // Get SMS config
      const { data: tenant } = await supabase
        .from('tenants')
        .select('config, name')
        .eq('id', profile.tenant_id)
        .single()

      const config = tenant?.config || {}
      const accountSid = config.sms_api_key
      const authToken = config.sms_api_secret
      const fromNumber = config.sms_from

      if (!accountSid || !authToken || !fromNumber) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'SMS no está configurado. Complete la configuración primero.' },
        })
      }

      // Send test SMS
      const normalizedPhone = normalizePhoneNumber(testPhone)
      const testMessage = `[PRUEBA] Este es un mensaje de prueba de ${tenant?.name || 'Vetic'}. Si recibiste esto, tu SMS está funcionando! 🎉`

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: fromNumber,
            To: normalizedPhone,
            Body: testMessage,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: `Error de Twilio: ${error.message || 'Error desconocido'}` },
        })
      }

      const result = await response.json()

      return NextResponse.json({
        success: true,
        message: `SMS de prueba enviado a ${normalizedPhone}`,
        message_id: result.sid,
      })
    } catch (e) {
      logger.error('Error testing SMS', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'] }
)

async function testTwilioConfig(
  accountSid: string,
  authToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
    })

    if (!response.ok) {
      return { success: false, error: 'Credenciales inválidas' }
    }

    return { success: true }
  } catch (_error: unknown) {
    return { success: false, error: 'No se pudo conectar a Twilio' }
  }
}

function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone
  return phone.slice(0, 4) + '****' + phone.slice(-2)
}

function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '595' + cleaned.substring(1)
  }
  if (!cleaned.startsWith('595') && cleaned.length === 9) {
    cleaned = '595' + cleaned
  }
  return '+' + cleaned
}
