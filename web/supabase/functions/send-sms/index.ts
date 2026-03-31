// Supabase Edge Function: Send Single SMS
// Can be invoked directly via HTTP for immediate SMS sending

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabase.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface SmsRequest {
  to: string
  body: string
  template?: string
  variables?: Record<string, string>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user's tenant
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['vet', 'admin'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Unauthorized - staff only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: SmsRequest = await req.json()
    let { to } = body
    let smsBody = body.body
    const { template, variables } = body

    if (!to) {
      return new Response(JSON.stringify({ error: 'Missing required field: to' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Normalize phone number (Paraguay format)
    to = normalizePhoneNumber(to)

    // If using a template, fetch and render it
    if (template) {
      const { data: templateData } = await supabaseAdmin
        .from('notification_templates')
        .select('body')
        .eq('tenant_id', profile.tenant_id)
        .eq('name', template)
        .eq('channel', 'sms')
        .single()

      if (templateData) {
        smsBody = renderTemplate(templateData.body, variables || {})
      }
    }

    if (!smsBody) {
      return new Response(JSON.stringify({ error: 'Missing SMS body or valid template' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Truncate SMS to 160 characters if too long (or use multi-part)
    if (smsBody.length > 160) {
      console.warn(`SMS body truncated from ${smsBody.length} to 160 characters`)
      smsBody = smsBody.substring(0, 157) + '...'
    }

    // Get tenant config
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('config')
      .eq('id', profile.tenant_id)
      .single()

    const config = tenant?.config || {}
    const accountSid = config.sms_api_key || Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = config.sms_api_secret || Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = config.sms_from || Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!accountSid || !authToken || !fromNumber) {
      return new Response(JSON.stringify({ error: 'SMS not configured for this tenant' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send SMS via Twilio
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: to,
          Body: smsBody,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Twilio error:', error)
      return new Response(JSON.stringify({ error: `SMS failed: ${error.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await response.json()

    // Log the sent SMS
    await supabaseAdmin.from('notification_log').insert({
      tenant_id: profile.tenant_id,
      channel: 'sms',
      recipient: to,
      status: 'sent',
      metadata: { message_id: result.sid, sent_by: user.id },
    })

    return new Response(JSON.stringify({ success: true, message_id: result.sid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error sending SMS:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

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
