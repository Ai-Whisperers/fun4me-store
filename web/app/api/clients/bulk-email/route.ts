import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { sendEmail } from '@/lib/email/client'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const bulkEmailSchema = z.object({
  client_ids: z.array(z.string().uuid()).min(1, 'Se requiere al menos un cliente'),
  subject: z.string().min(1, 'Asunto requerido').max(200, 'Asunto demasiado largo'),
  message: z.string().min(1, 'Mensaje requerido').max(5000, 'Mensaje demasiado largo'),
  template_id: z.string().uuid().optional(),
})

interface BulkEmailResult {
  success: boolean
  sent: number
  failed: number
  skipped: number
  errors: Array<{ clientId: string; error: string }>
}

/**
 * POST /api/clients/bulk-email - Send bulk email to selected clients
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      const body = await request.json()
      const validation = bulkEmailSchema.safeParse(body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: validation.error.flatten(),
        })
      }

      const { client_ids, subject, message, template_id } = validation.data

      // Fetch client emails with tenant validation
      const { data: clients, error: clientsError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', client_ids)
        .eq('tenant_id', profile.tenant_id)
        .not('email', 'is', null)

      if (clientsError) {
        logger.error('Error fetching clients for bulk email', {
          tenantId: profile.tenant_id,
          error: clientsError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      if (!clients || clients.length === 0) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { message: 'No se encontraron clientes válidos' },
        })
      }

      // Load template if specified
      let emailContent = message
      if (template_id) {
        const { data: template } = await supabase
          .from('message_templates')
          .select('content')
          .eq('id', template_id)
          .eq('tenant_id', profile.tenant_id)
          .single()

        if (template) {
          emailContent = template.content
        }
      }

      // Get clinic info for branding
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', profile.tenant_id)
        .single()

      const clinicName = tenant?.name || 'Clínica Veterinaria'

      // Send emails
      const result: BulkEmailResult = {
        success: true,
        sent: 0,
        failed: 0,
        skipped: client_ids.length - clients.length,
        errors: [],
      }

      for (const client of clients) {
        // Personalize message with client name
        const personalizedContent = emailContent
          .replace(/\{nombre\}/gi, client.full_name || 'Cliente')
          .replace(/\{email\}/gi, client.email || '')

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${clinicName}</h1>
            </div>
            <div style="padding: 30px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${personalizedContent}</p>
            </div>
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p>Este mensaje fue enviado por ${clinicName}</p>
            </div>
          </div>
        `

        const emailResult = await sendEmail({
          to: client.email,
          subject,
          html: htmlContent,
          text: personalizedContent,
        })

        if (emailResult.success) {
          result.sent++
        } else {
          result.failed++
          result.errors.push({
            clientId: client.id,
            error: emailResult.error || 'Error desconocido',
          })
        }
      }

      // Log bulk action for audit
      await supabase.from('audit_logs').insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        action: 'bulk_email',
        resource: 'clients',
        details: {
          total_clients: client_ids.length,
          sent: result.sent,
          failed: result.failed,
          skipped: result.skipped,
          subject,
        },
      })

      logger.info('Bulk email completed', {
        tenantId: profile.tenant_id,
        userId: user.id,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
      })

      return NextResponse.json(result)
    } catch (error) {
      logger.error('Bulk email error', {
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
