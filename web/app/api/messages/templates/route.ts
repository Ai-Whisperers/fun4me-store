import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, apiSuccess, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { templateQuerySchema, createTemplateSchema } from '@/lib/schemas/message'

/**
 * GET /api/messages/templates - List message templates
 * Uses scoped queries for automatic tenant isolation
 */
export const GET = withApiAuth(
  async ({ user, profile, scoped, request }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    
    // Validate query params
    const queryValidation = templateQuerySchema.safeParse({
      category: searchParams.get('category'),
    })
    
    const category = queryValidation.success ? queryValidation.data.category : null

    try {
      const { data: templates, error } = await scoped.select(
        'message_templates',
        '*',
        {
          filter: (q) => {
            let query = q.eq('is_active', true).is('deleted_at', null).order('category').order('name')
            if (category) {
              query = query.eq('category', category)
            }
            return query
          },
        }
      )

      if (error) throw error

      return NextResponse.json(templates)
    } catch (e) {
      logger.error('Error loading templates', {
        userId: user.id,
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : String(e),
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * POST /api/messages/templates - Create template
 * Uses scoped.insert() for automatic tenant_id injection
 */
export const POST = withApiAuth(
  async ({ user, profile, scoped, request }: ApiHandlerContext) => {
    try {
      const body = await request.json()
      
      // Validate input with Zod
      const validation = createTemplateSchema.safeParse(body)
      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { issues: validation.error.issues },
        })
      }

      const { name, category, subject, content, variables } = validation.data

      // scoped.insert() automatically adds tenant_id
      const { data: templates, error } = await scoped.insert('message_templates', {
        name,
        category,
        subject,
        content,
        variables: variables || [],
        is_active: true,
        created_by: user.id,
      })

      if (error) throw error

      const template = templates?.[0]
      return apiSuccess(template, 'Plantilla creada exitosamente', HTTP_STATUS.CREATED)
    } catch (e) {
      logger.error('Error creating template', {
        userId: user.id,
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : String(e),
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
