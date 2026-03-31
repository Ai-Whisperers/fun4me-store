import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, apiSuccess, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/insurance/policies
 * List insurance policies for the clinic (staff only)
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const petId = searchParams.get('pet_id')
    const providerId = searchParams.get('provider_id')

    try {
      let query = supabase
        .from('pet_insurance_policies')
        .select(
          `
          *,
          pets(id, name, species, breed, owner_id),
          insurance_providers(id, name, code, logo_url, claims_email, claims_phone)
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

      if (providerId) {
        query = query.eq('provider_id', providerId)
      }

      const { data: policies, error } = await query

      if (error) {
        logger.error('Error fetching insurance policies', {
          tenantId: profile.tenant_id,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({ data: policies || [] })
    } catch (e) {
      logger.error('Unexpected error fetching insurance policies', {
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * POST /api/insurance/policies
 * Create a new insurance policy (staff only)
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      const body = await request.json()
      const {
        pet_id,
        provider_id,
        policy_number,
        group_number,
        member_id,
        policyholder_name,
        policyholder_phone,
        policyholder_email,
        policyholder_address,
        effective_date,
        expiration_date,
        plan_name,
        plan_type,
        annual_limit,
        per_incident_limit,
        lifetime_limit,
        deductible_amount,
        deductible_type,
        coinsurance_percentage,
        copay_amount,
        accident_waiting_period,
        illness_waiting_period,
        orthopedic_waiting_period,
        pre_existing_conditions,
        excluded_conditions,
        coverage_notes,
        status = 'active',
      } = body

      if (!pet_id || !provider_id || !policy_number || !policyholder_name || !effective_date) {
        return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
          details: {
            required: [
              'pet_id',
              'provider_id',
              'policy_number',
              'policyholder_name',
              'effective_date',
            ],
          },
        })
      }

      // Verify pet belongs to clinic
      const { data: pet } = await supabase
        .from('pets')
        .select('id, tenant_id')
        .eq('id', pet_id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!pet) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'pet' },
        })
      }

      // Verify provider exists
      const { data: provider } = await supabase
        .from('insurance_providers')
        .select('id')
        .eq('id', provider_id)
        .single()

      if (!provider) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'provider' },
        })
      }

      const { data: policy, error } = await supabase
        .from('pet_insurance_policies')
        .insert({
          tenant_id: profile.tenant_id,
          pet_id,
          provider_id,
          policy_number,
          group_number,
          member_id,
          policyholder_name,
          policyholder_phone,
          policyholder_email,
          policyholder_address,
          effective_date,
          expiration_date,
          plan_name,
          plan_type,
          annual_limit,
          per_incident_limit,
          lifetime_limit,
          deductible_amount,
          deductible_type,
          coinsurance_percentage,
          copay_amount,
          accident_waiting_period,
          illness_waiting_period,
          orthopedic_waiting_period,
          pre_existing_conditions,
          excluded_conditions,
          coverage_notes,
          status,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        logger.error('Error creating insurance policy', {
          tenantId: profile.tenant_id,
          userId: user.id,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Audit log
      const { logAudit } = await import('@/lib/audit')
      await logAudit('CREATE_INSURANCE_POLICY', `pet_insurance_policies/${policy.id}`, {
        policy_number,
        pet_id,
        provider_id,
      })

      return apiSuccess(policy, 'Póliza creada', HTTP_STATUS.CREATED)
    } catch (e) {
      logger.error('Unexpected error creating insurance policy', {
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)
