import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, apiSuccess, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/insurance/pre-authorizations
 * List insurance pre-authorizations for the clinic (staff only)
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const petId = searchParams.get('pet_id')

    try {
      let query = supabase
        .from('insurance_pre_authorizations')
        .select(
          `
          *,
          pets(id, name, species),
          pet_insurance_policies(
            id, policy_number,
            insurance_providers(id, name, logo_url)
          )
        `
        )
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      if (petId) {
        query = query.eq('pet_id', petId)
      }

      const { data: preAuths, error } = await query

      if (error) {
        logger.error('Error fetching pre-authorizations', {
          tenantId: profile.tenant_id,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({ data: preAuths || [] })
    } catch (e) {
      logger.error('Unexpected error fetching pre-authorizations', {
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * POST /api/insurance/pre-authorizations
 * Create a new insurance pre-authorization (staff only)
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      const body = await request.json()
      const {
        policy_id,
        pet_id,
        procedure_description,
        procedure_code,
        diagnosis,
        estimated_cost,
        planned_date,
        clinical_justification,
        status = 'draft',
      } = body

      if (
        !policy_id ||
        !pet_id ||
        !procedure_description ||
        !diagnosis ||
        !estimated_cost ||
        !clinical_justification
      ) {
        return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
          details: {
            required: [
              'policy_id',
              'pet_id',
              'procedure_description',
              'diagnosis',
              'estimated_cost',
              'clinical_justification',
            ],
          },
        })
      }

      // Verify policy belongs to clinic and pet
      const { data: policy } = await supabase
        .from('pet_insurance_policies')
        .select('id, tenant_id, pet_id')
        .eq('id', policy_id)
        .eq('tenant_id', profile.tenant_id)
        .eq('pet_id', pet_id)
        .single()

      if (!policy) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'policy' },
        })
      }

      const { data: preAuth, error } = await supabase
        .from('insurance_pre_authorizations')
        .insert({
          tenant_id: profile.tenant_id,
          policy_id,
          pet_id,
          procedure_description,
          procedure_code,
          diagnosis,
          estimated_cost,
          planned_date,
          clinical_justification,
          status,
          requested_by: user.id,
        })
        .select()
        .single()

      if (error) {
        logger.error('Error creating pre-authorization', {
          tenantId: profile.tenant_id,
          userId: user.id,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Audit log
      const { logAudit } = await import('@/lib/audit')
      await logAudit('CREATE_PRE_AUTHORIZATION', `insurance_pre_authorizations/${preAuth.id}`, {
        policy_id,
        estimated_cost,
      })

      return apiSuccess(preAuth, 'Pre-autorización creada', HTTP_STATUS.CREATED)
    } catch (e) {
      logger.error('Unexpected error creating pre-authorization', {
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)
