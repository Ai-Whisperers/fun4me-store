import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

interface ConsentField {
  id?: string
  field_name: string
  field_type: string
  field_label: string
  is_required?: boolean
  field_options?: string[] | null
  display_order?: number
}

/**
 * PUT /api/consents/templates/[id]
 * Update a consent template (admin only)
 */
export const PUT = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const templateId = params.id

    // Verify template belongs to the tenant
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('consent_templates')
      .select('tenant_id')
      .eq('id', templateId)
      .single()

    if (fetchError || !existingTemplate) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'template' },
      })
    }

    // Only allow editing tenant-specific templates (not global ones)
    if (!existingTemplate.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'Cannot edit global templates' },
      })
    }

    if (existingTemplate.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Parse body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const {
      name,
      category,
      content,
      requires_witness,
      requires_id_verification,
      can_be_revoked,
      default_expiry_days,
      fields,
    } = body

    // Validate required fields
    if (!name || !category || !content) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['name', 'category', 'content'] },
      })
    }

    // Update template
    const { data, error } = await supabase
      .from('consent_templates')
      .update({
        name,
        category,
        content,
        requires_witness: requires_witness || false,
        requires_id_verification: requires_id_verification || false,
        can_be_revoked: can_be_revoked !== undefined ? can_be_revoked : true,
        default_expiry_days: default_expiry_days || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single()

    if (error) {
      logger.error('Error updating consent template', {
        tenantId: profile.tenant_id,
        userId: user.id,
        templateId,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Handle fields update
    if (fields && Array.isArray(fields)) {
      // Delete existing fields
      const { error: deleteError } = await supabase
        .from('consent_template_fields')
        .delete()
        .eq('template_id', templateId)

      if (deleteError) {
        logger.error('Error deleting consent template fields', {
          tenantId: profile.tenant_id,
          userId: user.id,
          templateId,
          error: deleteError.message,
        })
      }

      // Insert new fields
      if (fields.length > 0) {
        const fieldsToInsert = fields.map((field: ConsentField) => ({
          template_id: templateId,
          field_name: field.field_name,
          field_type: field.field_type,
          field_label: field.field_label,
          is_required: field.is_required || false,
          field_options: field.field_options || null,
          display_order: field.display_order || 0,
        }))

        const { error: fieldsError } = await supabase
          .from('consent_template_fields')
          .insert(fieldsToInsert)

        if (fieldsError) {
          logger.error('Error inserting consent template fields', {
            tenantId: profile.tenant_id,
            userId: user.id,
            templateId,
            error: fieldsError.message,
          })
        }
      }
    }

    return NextResponse.json(data, { status: 200 })
  },
  { roles: ['admin'], rateLimit: 'write' }
)

/**
 * DELETE /api/consents/templates/[id]
 * Soft delete a consent template (admin only)
 */
export const DELETE = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const templateId = params.id

    // Verify template belongs to the tenant
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('consent_templates')
      .select('tenant_id')
      .eq('id', templateId)
      .single()

    if (fetchError || !existingTemplate) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'template' },
      })
    }

    // Only allow deleting tenant-specific templates (not global ones)
    if (!existingTemplate.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'Cannot delete global templates' },
      })
    }

    if (existingTemplate.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('consent_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', templateId)

    if (error) {
      logger.error('Error deleting consent template', {
        tenantId: profile.tenant_id,
        userId: user.id,
        templateId,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json({ message: 'Plantilla eliminada correctamente' }, { status: 200 })
  },
  { roles: ['admin'], rateLimit: 'write' }
)
