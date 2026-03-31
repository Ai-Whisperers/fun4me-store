// Supabase Edge Function: Process Notification Queue
// This function is called by pg_cron every minute to process pending notifications

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { supabaseAdmin, NotificationQueueItem } from '../_shared/supabase.ts'
import { corsHeaders } from '../_shared/cors.ts'

const BATCH_SIZE = 50
const MAX_RETRIES = 3

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Processing notification queue...')

    // Get pending notifications (oldest first, respect scheduled_for)
    const { data: notifications, error: fetchError } = await supabaseAdmin
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
      .order('priority', { ascending: false }) // urgent first
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`)
    }

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending notifications', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Found ${notifications.length} pending notifications`)

    // Mark as processing
    const ids = notifications.map((n) => n.id)
    await supabaseAdmin.from('notification_queue').update({ status: 'processing' }).in('id', ids)

    // Process each notification
    const results = await Promise.allSettled(
      notifications.map((notification) => processNotification(notification))
    )

    // Count results
    const sent = results.filter((r) => r.status === 'fulfilled' && r.value.success).length
    const failed = results.filter(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
    ).length

    console.log(`Processed: ${sent} sent, ${failed} failed`)

    return new Response(
      JSON.stringify({
        message: 'Queue processed',
        total: notifications.length,
        sent,
        failed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing queue:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function processNotification(
  notification: NotificationQueueItem
): Promise<{ success: boolean; error?: string }> {
  try {
    let result: { success: boolean; messageId?: string; error?: string }

    switch (notification.channel) {
      case 'email':
        result = await sendEmail(notification)
        break
      case 'sms':
        result = await sendSms(notification)
        break
      case 'whatsapp':
        result = await sendWhatsApp(notification)
        break
      case 'push':
        result = await sendPush(notification)
        break
      default:
        result = { success: false, error: `Unknown channel: ${notification.channel}` }
    }

    if (result.success) {
      // Mark as sent and log
      await supabaseAdmin
        .from('notification_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          external_id: result.messageId,
        })
        .eq('id', notification.id)

      await logNotification(notification, 'sent')
    } else {
      // Handle failure
      const newRetryCount = notification.retry_count + 1
      const shouldRetry = newRetryCount < MAX_RETRIES

      await supabaseAdmin
        .from('notification_queue')
        .update({
          status: shouldRetry ? 'pending' : 'failed',
          retry_count: newRetryCount,
          error_message: result.error,
          failed_at: shouldRetry ? null : new Date().toISOString(),
        })
        .eq('id', notification.id)

      await logNotification(notification, 'failed', result.error)
    }

    return result
  } catch (error) {
    console.error(`Error processing notification ${notification.id}:`, error)
    return { success: false, error: error.message }
  }
}

async function sendEmail(notification: NotificationQueueItem) {
  // Get tenant config for email settings
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('config')
    .eq('id', notification.tenant_id)
    .single()

  const config = tenant?.config || {}
  const provider = config.email_provider || 'resend'

  // Use Resend by default (free tier available)
  const apiKey = config.email_api_key || Deno.env.get('RESEND_API_KEY')
  const fromEmail = config.email_from || Deno.env.get('DEFAULT_FROM_EMAIL') || 'noreply@vete.app'

  if (!apiKey) {
    return { success: false, error: 'No email API key configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: notification.recipient_address,
        subject: notification.subject || 'Notificación de tu veterinaria',
        html: formatEmailHtml(notification.body, notification.metadata),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `Resend error: ${error}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.id }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function sendSms(notification: NotificationQueueItem) {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('config')
    .eq('id', notification.tenant_id)
    .single()

  const config = tenant?.config || {}
  const accountSid = config.sms_api_key || Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = config.sms_api_secret || Deno.env.get('TWILIO_AUTH_TOKEN')
  const fromNumber = config.sms_from || Deno.env.get('TWILIO_PHONE_NUMBER')

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'SMS not configured' }
  }

  try {
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
          To: notification.recipient_address,
          Body: notification.body,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: `Twilio error: ${error.message}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.sid }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function sendWhatsApp(notification: NotificationQueueItem) {
  // WhatsApp via Twilio
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('config')
    .eq('id', notification.tenant_id)
    .single()

  const config = tenant?.config || {}
  const accountSid = config.sms_api_key || Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = config.sms_api_secret || Deno.env.get('TWILIO_AUTH_TOKEN')
  const fromNumber = config.whatsapp_from || Deno.env.get('TWILIO_WHATSAPP_NUMBER')

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'WhatsApp not configured' }
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: `whatsapp:${fromNumber}`,
          To: `whatsapp:${notification.recipient_address}`,
          Body: notification.body,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: `WhatsApp error: ${error.message}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.sid }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function sendPush(_notification: NotificationQueueItem) {
  // Push notifications would require FCM/APNS integration
  // For now, just mark as not implemented
  return { success: false, error: 'Push notifications not yet implemented' }
}

async function logNotification(
  notification: NotificationQueueItem,
  status: 'sent' | 'failed',
  error?: string
) {
  await supabaseAdmin.from('notification_log').insert({
    tenant_id: notification.tenant_id,
    queue_id: notification.id,
    channel: notification.channel,
    recipient: notification.recipient_address,
    subject: notification.subject,
    status,
    error_message: error,
    metadata: notification.metadata,
  })
}

function formatEmailHtml(body: string, metadata: Record<string, unknown>): string {
  const clinicName = metadata.clinic_name || 'Tu Veterinaria'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${clinicName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white;">
    <tr>
      <td style="padding: 32px 24px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);">
        <h1 style="margin: 0; color: white; font-size: 24px;">${clinicName}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 24px;">
        <div style="color: #374151; font-size: 16px; line-height: 1.6;">
          ${body.replace(/\n/g, '<br>')}
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; text-align: center; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          Este mensaje fue enviado automáticamente por ${clinicName}.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}
