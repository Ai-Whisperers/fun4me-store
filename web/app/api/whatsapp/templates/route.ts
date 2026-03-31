import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const templateSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  category: z.enum([
    'appointment_reminder',
    'vaccine_reminder',
    'general',
    'promotional',
    'follow_up',
  ]),
  content: z.string().min(1, 'Contenido requerido'),
  variables: z.array(z.string()).optional(),
})

/**
 * GET /api/whatsapp/templates - List WhatsApp templates
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    try {
      const { searchParams } = new URL(request.url)
      const category = searchParams.get('category')
      const activeOnly = searchParams.get('active') === 'true'

      let query = supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('name')

      if (category) {
        query = query.eq('category', category)
      }

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data: templates, error } = await query

      if (error) {
        logger.error('Error fetching WhatsApp templates', {
          tenantId: profile.tenant_id,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({ data: templates })
    } catch (error) {
      logger.error('WhatsApp templates GET error', {
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * POST /api/whatsapp/templates - Create WhatsApp template
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      // Parse and validate body
      const body = await request.json()
      const validation = templateSchema.safeParse(body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: validation.error.flatten(),
        })
      }

      const { name, category, content, variables } = validation.data

      // Check for duplicate name
      const { data: existing } = await supabase
        .from('whatsapp_templates')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('name', name)
        .single()

      if (existing) {
        return apiError('CONFLICT', HTTP_STATUS.CONFLICT, {
          details: { message: 'Ya existe una plantilla con este nombre' },
        })
      }

      const { data: template, error } = await supabase
        .from('whatsapp_templates')
        .insert({
          tenant_id: profile.tenant_id,
          name,
          category,
          content,
          variables: variables || [],
          created_by: user.id,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        logger.error('Error creating WhatsApp template', {
          tenantId: profile.tenant_id,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({ data: template }, { status: 201 })
    } catch (error) {
      logger.error('WhatsApp templates POST error', {
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
