import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { sendWhatsAppMessage } from '@/lib/whatsapp/client'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { NOT_FOUND_ERRORS, DATABASE_ERRORS } from '@/lib/i18n/errors'
import { requireFeature } from '@/lib/features/server'
import { z } from 'zod'

const bulkWhatsAppSchema = z.object({
  client_ids: z.array(z.string().uuid()).min(1, 'Se requiere al menos un cliente'),
  message: z.string().min(1, 'Mensaje requerido').max(4096, 'Mensaje demasiado largo'),
  template_id: z.string().uuid().optional(),
})

interface BulkWhatsAppResult {
  success: boolean
  sent: number
  failed: number
  skipped: number
  errors: Array<{ clientId: string; error: string }>
}

/**
 * POST /api/clients/bulk-whatsapp - Send bulk WhatsApp messages to selected clients
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase, log }: ApiHandlerContext) => {
    // Check if tenant has WhatsApp API feature enabled
    const featureCheck = await requireFeature(profile.tenant_id, 'whatsappApi')
    if (featureCheck) return featureCheck

    try {
      const body = await request.json()
      const validation = bulkWhatsAppSchema.safeParse(body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: validation.error.flatten(),
        })
      }

      const { client_ids, message, template_id } = validation.data

      // Fetch client phone numbers with tenant validation
      const { data: clients, error: clientsError } = await supabase
        .from('profiles')
        .select('id, phone, full_name')
        .in('id', client_ids)
        .eq('tenant_id', profile.tenant_id)
        .not('phone', 'is', null)

      if (clientsError) {
        log.error('Error fetching clients for bulk WhatsApp', {
          tenantId: profile.tenant_id,
          error: clientsError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
          details: { message: DATABASE_ERRORS.QUERY_FAILED },
        })
      }

      if (!clients || clients.length === 0) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { message: NOT_FOUND_ERRORS.USER },
        })
      }

      // Load template if specified
      let messageContent = message
      if (template_id) {
        const { data: template } = await supabase
          .from('message_templates')
          .select('content')
          .eq('id', template_id)
          .eq('tenant_id', profile.tenant_id)
          .single()

        if (template) {
          messageContent = template.content
        }
      }

      // Send WhatsApp messages
      const result: BulkWhatsAppResult = {
        success: true,
        sent: 0,
        failed: 0,
        skipped: client_ids.length - clients.length,
        errors: [],
      }

      for (const client of clients) {
        // Personalize message with client name
        const personalizedMessage = messageContent
          .replace(/\{nombre\}/gi, client.full_name || 'Cliente')
          .replace(/\{telefono\}/gi, client.phone || '')

        // Create WhatsApp message record
        const { data: messageRecord, error: insertError } = await supabase
          .from('whatsapp_messages')
          .insert({
            tenant_id: profile.tenant_id,
            client_id: client.id,
            phone_number: client.phone,
            direction: 'outbound',
            content: personalizedMessage,
            status: 'queued',
            conversation_type: 'general',
            template_id: template_id || null,
            sent_by: user.id,
          })
          .select('id')
          .single()

        if (insertError) {
          result.failed++
          result.errors.push({
            clientId: client.id,
            error: 'Error al crear registro de mensaje',
          })
          continue
        }

        // Send via Twilio
        const whatsappResult = await sendWhatsAppMessage({
          to: client.phone,
          body: personalizedMessage,
        })

        if (whatsappResult.success && whatsappResult.sid) {
          // Update message status to sent
          await supabase
            .from('whatsapp_messages')
            .update({
              status: 'sent',
              twilio_sid: whatsappResult.sid,
              sent_at: new Date().toISOString(),
            })
            .eq('id', messageRecord.id)

          result.sent++
        } else {
          // Update message status to failed
          await supabase
            .from('whatsapp_messages')
            .update({
              status: 'failed',
              error_message: whatsappResult.error || 'Error desconocido',
            })
            .eq('id', messageRecord.id)

          result.failed++
          result.errors.push({
            clientId: client.id,
            error: whatsappResult.error || 'Error al enviar mensaje',
          })
        }
      }

      // Log bulk action for audit
      await supabase.from('audit_logs').insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        action: 'bulk_whatsapp',
        resource: 'clients',
        details: {
          total_clients: client_ids.length,
          sent: result.sent,
          failed: result.failed,
          skipped: result.skipped,
        },
      })

      log.info('Bulk WhatsApp completed', {
        tenantId: profile.tenant_id,
        userId: user.id,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
      })

      return NextResponse.json(result)
    } catch (error) {
      log.error('Bulk WhatsApp error', {
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: DATABASE_ERRORS.SERVER_ERROR },
      })
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
