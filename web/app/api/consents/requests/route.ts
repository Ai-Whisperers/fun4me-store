import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email/client'
import {
  generateConsentRequestEmail,
  generateConsentRequestEmailText,
} from '@/lib/email/templates/consent-request'
import { logger } from '@/lib/logger'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  // Authentication check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('clinic_id:tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'profile' },
    })
  }

  if (!['vet', 'admin'].includes(profile.role)) {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN)
  }

  // Parse body
  const rateLimitResult = await rateLimit(request, 'write', user.id)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  let body
  try {
    body = await request.json()
  } catch (_error: unknown) {
    return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
  }

  const {
    template_id,
    pet_id,
    owner_id,
    delivery_method,
    recipient_email,
    recipient_phone,
    expires_in_hours,
  } = body

  // Validate required fields
  if (!template_id || !pet_id || !owner_id || !delivery_method) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { required: ['template_id', 'pet_id', 'owner_id', 'delivery_method'] },
    })
  }

  if (delivery_method === 'email' && !recipient_email) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { required: ['recipient_email'] },
    })
  }

  if (delivery_method === 'sms' && !recipient_phone) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { required: ['recipient_phone'] },
    })
  }

  // Verify pet belongs to staff's clinic
  const { data: pet } = await supabase
    .from('pets')
    .select('id, tenant_id, owner_id, name')
    .eq('id', pet_id)
    .single()

  if (!pet) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'pet' },
    })
  }

  if (pet.tenant_id !== profile.clinic_id) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
  }

  // Verify owner
  if (pet.owner_id !== owner_id) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      details: { message: 'Owner does not match pet' },
    })
  }

  // Get owner info
  const { data: owner } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('id', owner_id)
    .single()

  if (!owner) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'owner' },
    })
  }

  // Get template info
  const { data: template } = await supabase
    .from('consent_templates')
    .select('id, name, category')
    .eq('id', template_id)
    .single()

  if (!template) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'template' },
    })
  }

  // Generate unique token
  const token = crypto.randomBytes(32).toString('hex')

  // Calculate expiry date
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + (expires_in_hours || 48))

  // Create consent request
  const { data, error } = await supabase
    .from('consent_requests')
    .insert({
      template_id,
      pet_id,
      owner_id,
      requested_by_id: user.id,
      token,
      delivery_method,
      recipient_email: recipient_email || owner.email,
      recipient_phone: recipient_phone || owner.phone,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    logger.error('Error creating consent request', {
      error: error.message,
      tenantId: profile.clinic_id,
      userId: user.id,
      petId: pet_id,
      templateId: template_id,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  // Generate signing link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const signingLink = `${baseUrl}/consent/${token}`

  // Get clinic/tenant info for email
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('id', profile.clinic_id)
    .single()

  // Get staff member name
  const { data: staffProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Send email if delivery method is email
  if (delivery_method === 'email' && (recipient_email || owner.email)) {
    try {
      const emailData = {
        clinicName: tenant?.name || profile.clinic_id,
        ownerName: owner.full_name || 'Cliente',
        petName: pet.name,
        consentType: template.name,
        consentCategory: template.category,
        signingLink,
        expiresAt: expiresAt.toISOString(),
        requestedBy: staffProfile?.full_name,
      }

      const html = generateConsentRequestEmail(emailData)
      const text = generateConsentRequestEmailText(emailData)

      const emailResult = await sendEmail({
        to: recipient_email || owner.email,
        subject: `Solicitud de Consentimiento - ${template.name}`,
        html,
        text,
      })

      if (!emailResult.success) {
        logger.warn('Failed to send consent request email', {
          error: emailResult.error,
          tenantId: profile.clinic_id,
          petId: pet_id,
        })
        // Don't fail the whole operation if email fails
      }
    } catch (emailError: unknown) {
      logger.warn('Exception sending consent request email', {
        error: emailError instanceof Error ? emailError.message : 'Unknown',
        tenantId: profile.clinic_id,
        petId: pet_id,
      })
      // Don't fail the whole operation if email fails
    }
  } else if (delivery_method === 'sms' && (recipient_phone || owner.phone)) {
    // Send consent request via SMS
    try {
      const phone = recipient_phone || owner.phone
      const smsMessage = `${tenant?.name || 'Tu veterinaria'}: Hola ${owner.full_name || ''}, necesitamos tu firma para ${template.name} de ${pet.name}. Firma aquí: ${signingLink}`

      // Get tenant SMS config
      const { data: tenantConfig } = await supabase
        .from('tenants')
        .select('config')
        .eq('id', profile.clinic_id)
        .single()

      const config = tenantConfig?.config || {}
      const accountSid = config.sms_api_key || process.env.TWILIO_ACCOUNT_SID
      const authToken = config.sms_api_secret || process.env.TWILIO_AUTH_TOKEN
      const fromNumber = config.sms_from || process.env.TWILIO_PHONE_NUMBER

      if (accountSid && authToken && fromNumber) {
        // Normalize phone number (Paraguay format)
        let normalizedPhone = phone.replace(/\D/g, '')
        if (normalizedPhone.startsWith('0')) {
          normalizedPhone = '595' + normalizedPhone.substring(1)
        }
        if (!normalizedPhone.startsWith('595') && normalizedPhone.length === 9) {
          normalizedPhone = '595' + normalizedPhone
        }
        normalizedPhone = '+' + normalizedPhone

        const smsResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization:
                'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: fromNumber,
              To: normalizedPhone,
              Body: smsMessage.substring(0, 160),
            }),
          }
        )

        if (!smsResponse.ok) {
          const smsErrorData = await smsResponse.json()
          logger.warn('Failed to send consent request SMS', {
            error: smsErrorData?.message || 'SMS failed',
            tenantId: profile.clinic_id,
            petId: pet_id,
          })
        }
      } else {
        logger.warn('SMS not configured for this tenant', {
          tenantId: profile.clinic_id,
        })
      }
    } catch (smsError: unknown) {
      logger.warn('Exception sending consent request SMS', {
        error: smsError instanceof Error ? smsError.message : 'Unknown',
        tenantId: profile.clinic_id,
        petId: pet_id,
      })
      // Don't fail the whole operation if SMS fails
    }
  }

  return NextResponse.json(
    {
      ...data,
      signing_link: signingLink,
    },
    { status: 201 }
  )
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  // Authentication check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('clinic_id:tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'profile' },
    })
  }

  if (!['vet', 'admin'].includes(profile.role)) {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN)
  }

  // Get consent requests
  const { data, error } = await supabase
    .from('consent_requests')
    .select(
      `
      *,
      pet:pets!inner(id, name, tenant_id),
      owner:profiles!owner_id(id, full_name, email),
      template:consent_templates!template_id(id, name, category),
      requested_by:profiles!requested_by_id(id, full_name)
    `
    )
    .eq('pet.tenant_id', profile.clinic_id)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Error fetching consent requests', {
      error: error.message,
      tenantId: profile.clinic_id,
      userId: user.id,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return NextResponse.json(data)
}
