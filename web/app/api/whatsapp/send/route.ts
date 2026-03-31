import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp/client'
import { formatParaguayPhone } from '@/lib/types/whatsapp'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { requireFeature } from '@/lib/features/server'
import { z } from 'zod'

const sendMessageSchema = z.object({
  phone: z.string().min(1, 'Número requerido'),
  message: z.string().min(1, 'Mensaje requerido'),
  clientId: z.string().uuid().optional(),
  petId: z.string().uuid().optional(),
  conversationType: z
    .enum(['appointment_reminder', 'vaccine_reminder', 'general', 'support'])
    .optional(),
  templateId: z.string().uuid().optional(),
})

/**
 * POST /api/whatsapp/send - Send WhatsApp message
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    // Check if tenant has WhatsApp API feature enabled
    const featureCheck = await requireFeature(profile.tenant_id, 'whatsappApi')
    if (featureCheck) return featureCheck

    try {
      // Parse and validate body
      const body = await request.json()
      const validation = sendMessageSchema.safeParse(body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: validation.error.flatten(),
        })
      }

      const { phone, message, clientId, petId, conversationType, templateId } = validation.data
      const formattedPhone = formatParaguayPhone(phone)

      // Create message record first
      const { data: messageRecord, error: insertError } = await supabase
        .from('whatsapp_messages')
        .insert({
          tenant_id: profile.tenant_id,
          client_id: clientId || null,
          pet_id: petId || null,
          phone_number: formattedPhone,
          direction: 'outbound',
          content: message,
          status: 'queued',
          conversation_type: conversationType || 'general',
          template_id: templateId || null,
          sent_by: user.id,
        })
        .select()
        .single()

      if (insertError) {
        logger.error('Error creating WhatsApp message record', {
          tenantId: profile.tenant_id,
          error: insertError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Send via Twilio
      const result = await sendWhatsAppMessage({
        to: formattedPhone,
        body: message,
      })

      // Update message status
      if (result.success && result.sid) {
        await supabase
          .from('whatsapp_messages')
          .update({
            status: 'sent',
            twilio_sid: result.sid,
            sent_at: new Date().toISOString(),
          })
          .eq('id', messageRecord.id)

        return NextResponse.json({
          success: true,
          messageId: messageRecord.id,
          twilioSid: result.sid,
        })
      } else {
        await supabase
          .from('whatsapp_messages')
          .update({
            status: 'failed',
            error_message: result.error || 'Error desconocido',
          })
          .eq('id', messageRecord.id)

        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Error al enviar mensaje',
            messageId: messageRecord.id,
          },
          { status: 500 }
        )
      }
    } catch (error) {
      logger.error('WhatsApp send error', {
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
