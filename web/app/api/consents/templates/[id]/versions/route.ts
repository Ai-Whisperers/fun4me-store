import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/consents/templates/[id]/versions
 * Get version history for a consent template
 */
export const GET = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const templateId = params.id

    try {
      // Get template info to verify access
      const { data: template, error: templateError } = await supabase
        .from('consent_templates')
        .select('id, tenant_id, code')
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

      // Get all versions from consent_template_versions table
      const { data: versions, error } = await supabase
        .from('consent_template_versions')
        .select(
          `
          id,
          version_number,
          version_label,
          title,
          change_summary,
          is_published,
          published_at,
          created_at,
          created_by,
          creator:profiles!consent_template_versions_created_by_fkey(full_name)
        `
        )
        .eq('template_id', templateId)
        .order('version_number', { ascending: false })

      if (error) throw error

      // Get document counts for each version (documents reference template, not version)
      const { data: docCounts } = await supabase
        .from('consent_documents')
        .select('template_version')
        .eq('template_id', templateId)

      const countMap: Record<number, number> = {}
      docCounts?.forEach((doc) => {
        const version = doc.template_version || 1
        countMap[version] = (countMap[version] || 0) + 1
      })

      const versionsWithCounts = versions?.map((v) => ({
        id: v.id,
        version_number: v.version_number,
        version_label: v.version_label,
        title: v.title,
        change_summary: v.change_summary,
        is_published: v.is_published,
        published_at: v.published_at,
        created_at: v.created_at,
        documents_count: countMap[v.version_number] || 0,
        creator_name: Array.isArray(v.creator)
          ? v.creator[0]?.full_name
          : (v.creator as { full_name?: string })?.full_name,
      }))

      return NextResponse.json({ data: versionsWithCounts || [] })
    } catch (e) {
      logger.error('Error fetching consent template versions', {
        tenantId: profile.tenant_id,
        userId: user.id,
        templateId,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * POST /api/consents/templates/[id]/versions
 * Create a new version of a consent template (saves current, updates template)
 */
export const POST = withApiAuthParams(
  async ({
    request,
    params,
    user,
    profile,
    supabase,
  }: ApiHandlerContextWithParams<{ id: string }>) => {
    const templateId = params.id

    try {
      const body = await request.json()
      const { content_html, title, change_summary } = body

      if (!content_html || !title) {
        return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
          details: { required: ['content_html', 'title'] },
        })
      }

      // Get current template
      const { data: template, error: templateError } = await supabase
        .from('consent_templates')
        .select('*')
        .eq('id', templateId)
        .is('deleted_at', null)
        .single()

      if (templateError || !template) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'template' },
        })
      }

      // Can only version tenant-specific templates
      if (!template.tenant_id) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
          details: { message: 'No se pueden versionar plantillas globales' },
        })
      }

      if (template.tenant_id !== profile.tenant_id) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      // Use RPC function to create version atomically
      const { data: versionId, error: rpcError } = await supabase.rpc(
        'create_consent_template_version',
        {
          p_template_id: templateId,
          p_title: title,
          p_content_html: content_html,
          p_change_summary: change_summary || null,
          p_user_id: user.id,
        }
      )

      if (rpcError) {
        logger.error('Error creating consent template version via RPC', {
          tenantId: profile.tenant_id,
          userId: user.id,
          templateId,
          error: rpcError.message,
        })
        throw rpcError
      }

      // Get the updated template
      const { data: updatedTemplate } = await supabase
        .from('consent_templates')
        .select('id, version, title, published_at')
        .eq('id', templateId)
        .single()

      return NextResponse.json(
        {
          success: true,
          data: {
            version_id: versionId,
            template: updatedTemplate,
          },
          message: `Versión ${updatedTemplate?.version} creada exitosamente`,
        },
        { status: 201 }
      )
    } catch (e) {
      logger.error('Error creating consent template version', {
        tenantId: profile.tenant_id,
        userId: user.id,
        templateId,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
