// Supabase Edge Function: Send Single Email
// Can be invoked directly via HTTP for immediate email sending

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabase.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface EmailRequest {
  to: string
  subject: string
  body: string
  tenant_id?: string
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

    // Verify the JWT token
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

    const body: EmailRequest = await req.json()
    const { to, subject, template, variables } = body
    let emailBody = body.body

    if (!to) {
      return new Response(JSON.stringify({ error: 'Missing required field: to' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // If using a template, fetch and render it
    if (template) {
      const { data: templateData } = await supabaseAdmin
        .from('notification_templates')
        .select('subject, body')
        .eq('tenant_id', profile.tenant_id)
        .eq('name', template)
        .eq('channel', 'email')
        .single()

      if (templateData) {
        emailBody = renderTemplate(templateData.body, variables || {})
        // Use template subject if not overridden
        if (!subject && templateData.subject) {
          body.subject = renderTemplate(templateData.subject, variables || {})
        }
      }
    }

    if (!emailBody) {
      return new Response(JSON.stringify({ error: 'Missing email body or valid template' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get tenant config
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, config')
      .eq('id', profile.tenant_id)
      .single()

    const config = tenant?.config || {}
    const apiKey = config.email_api_key || Deno.env.get('RESEND_API_KEY')
    const fromEmail = config.email_from || Deno.env.get('DEFAULT_FROM_EMAIL') || 'noreply@vete.app'

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Email not configured for this tenant' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: to,
        subject: subject || 'Mensaje de tu veterinaria',
        html: formatEmailHtml(emailBody, tenant?.name || 'Tu Veterinaria'),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Resend error:', errorText)
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await response.json()

    // Log the sent email
    await supabaseAdmin.from('notification_log').insert({
      tenant_id: profile.tenant_id,
      channel: 'email',
      recipient: to,
      subject: subject,
      status: 'sent',
      metadata: { message_id: result.id, sent_by: user.id },
    })

    return new Response(JSON.stringify({ success: true, message_id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return result
}

function formatEmailHtml(body: string, clinicName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
          Este mensaje fue enviado por ${clinicName}.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}
