import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { createConsentTemplateSchema } from '@/lib/schemas/consent'

interface ConsentField {
  field_name: string
  field_type: string
  field_label: string
  is_required?: boolean
  field_options?: string[] | null
  display_order?: number
}

export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // Get templates - global and tenant-specific
    let query = supabase
      .from('consent_templates')
      .select(
        `
        *,
        fields:consent_template_fields(*)
      `
      )
      .or(`tenant_id.is.null,tenant_id.eq.${profile.tenant_id}`)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching consent templates', {
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data)
  },
  { roles: ['vet', 'admin'] }
)

export const POST = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    // Parse and validate body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const result = createConsentTemplateSchema.safeParse(body)
    if (!result.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { errors: result.error.flatten().fieldErrors },
      })
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
    } = result.data

    // Insert template
    const { data, error } = await supabase
      .from('consent_templates')
      .insert({
        tenant_id: profile.tenant_id,
        name,
        category,
        content,
        requires_witness: requires_witness || false,
        requires_id_verification: requires_id_verification || false,
        can_be_revoked: can_be_revoked || true,
        default_expiry_days: default_expiry_days || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating consent template', {
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data, { status: HTTP_STATUS.CREATED })
  },
  { roles: ['admin'], rateLimit: 'write' }
)
