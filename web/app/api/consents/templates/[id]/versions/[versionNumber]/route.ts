import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/consents/templates/[id]/versions/[versionNumber]
 * Get a specific version's content
 */
export const GET = withApiAuthParams(
  async ({
    params,
    user,
    profile,
    supabase,
  }: ApiHandlerContextWithParams<{ id: string; versionNumber: string }>) => {
    const templateId = params.id
    const versionNumber = parseInt(params.versionNumber, 10)

    if (isNaN(versionNumber) || versionNumber < 1) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Número de versión inválido' },
      })
    }

    try {
      // Get template info to verify access
      const { data: template, error: templateError } = await supabase
        .from('consent_templates')
        .select('id, tenant_id')
        .eq('id', templateId)
        .is('deleted_at', null)
        .single()

      if (templateError || !template) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'template' },
        })
      }

      // Verify tenant access
      if (template.tenant_id && template.tenant_id !== profile.tenant_id) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      // Get the specific version
      const { data: version, error } = await supabase
        .from('consent_template_versions')
        .select(
          `
          id,
          template_id,
          version_number,
          version_label,
          title,
          content_html,
          change_summary,
          is_published,
          published_at,
          created_at,
          created_by,
          creator:profiles!consent_template_versions_created_by_fkey(full_name)
        `
        )
        .eq('template_id', templateId)
        .eq('version_number', versionNumber)
        .single()

      if (error || !version) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'version' },
        })
      }

      return NextResponse.json({
        data: {
          ...version,
          creator_name: Array.isArray(version.creator)
            ? version.creator[0]?.full_name
            : (version.creator as { full_name?: string })?.full_name,
        },
      })
    } catch (e) {
      logger.error('Error fetching consent template version', {
        tenantId: profile.tenant_id,
        userId: user.id,
        templateId,
        versionNumber,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * POST /api/consents/templates/[id]/versions/[versionNumber]
 * Rollback to a specific version (admin only)
 */
export const POST = withApiAuthParams(
  async ({
    params,
    user,
    profile,
    supabase,
  }: ApiHandlerContextWithParams<{ id: string; versionNumber: string }>) => {
    const templateId = params.id
    const versionNumber = parseInt(params.versionNumber, 10)

    if (isNaN(versionNumber) || versionNumber < 1) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Número de versión inválido' },
      })
    }

    try {
      // Get template info to verify access
      const { data: template, error: templateError } = await supabase
        .from('consent_templates')
        .select('id, tenant_id')
        .eq('id', templateId)
        .is('deleted_at', null)
        .single()

      if (templateError || !template) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'template' },
        })
      }

      // Can only rollback tenant-specific templates
      if (!template.tenant_id) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
          details: { message: 'No se pueden restaurar versiones de plantillas globales' },
        })
      }

      if (template.tenant_id !== profile.tenant_id) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      // Use RPC function to rollback atomically
      const { data: newVersionId, error: rpcError } = await supabase.rpc(
        'rollback_consent_template_version',
        {
          p_template_id: templateId,
          p_target_version_number: versionNumber,
          p_user_id: user.id,
        }
      )

      if (rpcError) {
        logger.error('Error rolling back consent template version', {
          tenantId: profile.tenant_id,
          userId: user.id,
          templateId,
          targetVersion: versionNumber,
          error: rpcError.message,
        })

        if (rpcError.message.includes('not found')) {
          return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
            details: { resource: 'version' },
          })
        }

        throw rpcError
      }

      // Get the updated template
      const { data: updatedTemplate } = await supabase
        .from('consent_templates')
        .select('id, version, title, published_at')
        .eq('id', templateId)
        .single()

      // Log audit event
      await supabase.from('audit_logs').insert({
        tenant_id: template.tenant_id,
        user_id: user.id,
        action: 'consent_template_rollback',
        resource: 'consent_templates',
        resource_id: templateId,
        details: {
          from_current: true,
          to_version: versionNumber,
          new_version_id: newVersionId,
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          version_id: newVersionId,
          template: updatedTemplate,
        },
        message: `Restaurado a versión ${versionNumber} exitosamente`,
      })
    } catch (e) {
      logger.error('Error rolling back consent template version', {
        tenantId: profile.tenant_id,
        userId: user.id,
        templateId,
        versionNumber,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
