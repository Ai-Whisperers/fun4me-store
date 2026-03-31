import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * POST /api/sms/send
 * Send an SMS message directly
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      const body = await request.json()
      const { to, message, template_name, variables, client_id } = body

      if (!to || (!message && !template_name)) {
        return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
          details: { required: ['to', 'message or template_name'] },
        })
      }

      // Normalize phone number (Paraguay format)
      const normalizedPhone = normalizePhoneNumber(to)

      // Get message content
      let smsBody = message

      if (template_name && !message) {
        // Fetch template
        const { data: template } = await supabase
          .from('notification_templates')
          .select('body')
          .eq('tenant_id', profile.tenant_id)
          .eq('name', template_name)
          .eq('channel_type', 'sms')
          .single()

        if (template) {
          smsBody = renderTemplate(template.body, variables || {})
        } else {
          return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
            details: { resource: 'template' },
          })
        }
      }

      // Truncate if too long
      if (smsBody.length > 160) {
        smsBody = smsBody.substring(0, 157) + '...'
      }

      // Get SMS config from tenant
      const { data: tenant } = await supabase
        .from('tenants')
        .select('config, name')
        .eq('id', profile.tenant_id)
        .single()

      const config = tenant?.config || {}
      const accountSid = config.sms_api_key || process.env.TWILIO_ACCOUNT_SID
      const authToken = config.sms_api_secret || process.env.TWILIO_AUTH_TOKEN
      const fromNumber = config.sms_from || process.env.TWILIO_PHONE_NUMBER

      if (!accountSid || !authToken || !fromNumber) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
          details: { message: 'SMS no está configurado para esta clínica' },
        })
      }

      // Send via Twilio
      const twilioResponse = await fetch(
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
            Body: smsBody,
            StatusCallback: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/sms/webhook`,
          }),
        }
      )

      if (!twilioResponse.ok) {
        const error = await twilioResponse.json()
        logger.error('Twilio error sending SMS', {
          tenantId: profile.tenant_id,
          userId: user.id,
          error: error.message || 'Unknown',
        })
        return apiError('VALIDATION_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
          details: { message: `Error de Twilio: ${error.message || 'Error desconocido'}` },
        })
      }

      const result = await twilioResponse.json()

      // Log to notification_log
      await supabase.from('notification_log').insert({
        tenant_id: profile.tenant_id,
        client_id: client_id || null,
        channel_type: 'sms',
        destination: normalizedPhone,
        body: smsBody,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })

      // Also log as whatsapp_message for unified messaging history
      await supabase.from('whatsapp_messages').insert({
        tenant_id: profile.tenant_id,
        phone_number: normalizedPhone,
        direction: 'outgoing',
        message_type: 'text',
        content: smsBody,
        status: 'sent',
        external_id: result.sid,
        sent_by: user.id,
      })

      return NextResponse.json({
        success: true,
        message_id: result.sid,
        to: normalizedPhone,
        status: result.status,
      })
    } catch (e) {
      logger.error('Error sending SMS', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')

  // Paraguay phone numbers
  // Mobile: 09xx xxx xxx (10 digits starting with 09)
  // With country code: +595 9xx xxx xxx

  // If starts with 0, assume local Paraguay number
  if (cleaned.startsWith('0')) {
    cleaned = '595' + cleaned.substring(1)
  }

  // If doesn't have country code, add Paraguay's
  if (!cleaned.startsWith('595') && cleaned.length === 9) {
    cleaned = '595' + cleaned
  }

  return '+' + cleaned
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return result
}
