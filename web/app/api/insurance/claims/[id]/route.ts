import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/insurance/claims/[id]
 * Get claim detail with all related data
 */
export const GET = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const { id } = params

    try {
      const { data: claim, error } = await supabase
        .from('insurance_claims')
        .select(
          `
          *,
          pets(id, name, species, breed, date_of_birth),
          pet_insurance_policies(
            id, policy_number, plan_name, deductible_amount, coinsurance_percentage,
            insurance_providers(id, name, logo_url, claims_email, claims_phone)
          ),
          insurance_claim_items(
            id, service_date, service_code, description, quantity,
            unit_price, total_price, approved_amount, denial_reason
          ),
          insurance_claim_documents(
            id, document_type, title, file_url, sent_to_insurance, sent_at, created_at
          ),
          insurance_claim_communications(
            id, direction, channel, subject, content, contact_name,
            created_at, requires_follow_up, follow_up_date
          ),
          insurance_eob(
            id, eob_number, eob_date, billed_amount, allowed_amount,
            deductible_amount, coinsurance_amount, paid_amount, patient_responsibility
          )
        `
        )
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (error) throw error

      if (!claim) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'claim' },
        })
      }

      return NextResponse.json(claim)
    } catch (e) {
      logger.error('Error loading claim detail', {
        tenantId: profile.tenant_id,
        userId: user.id,
        claimId: id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * PATCH /api/insurance/claims/[id]
 * Update claim status and details
 */
export const PATCH = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const { id } = params

    try {
      const body = await request.json()
      const {
        status,
        provider_claim_number,
        approved_amount,
        paid_amount,
        denial_reason,
        denial_code,
        internal_notes,
        provider_notes,
        submission_method,
        confirmation_number,
        payment_method,
        payment_reference,
      } = body

      // Verify claim belongs to clinic
      const { data: existingClaim } = await supabase
        .from('insurance_claims')
        .select('id, tenant_id, status')
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!existingClaim) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'claim' },
        })
      }

      // Build update object
      interface ClaimUpdates {
        status?: string
        provider_claim_number?: string
        approved_amount?: number
        paid_amount?: number
        denial_reason?: string
        denial_code?: string
        internal_notes?: string
        provider_notes?: string
        submission_method?: string
        confirmation_number?: string
        payment_method?: string
        payment_reference?: string
        processed_by?: string
      }
      const updates: ClaimUpdates = {}
      if (status !== undefined) updates.status = status
      if (provider_claim_number !== undefined) updates.provider_claim_number = provider_claim_number
      if (approved_amount !== undefined) updates.approved_amount = approved_amount
      if (paid_amount !== undefined) updates.paid_amount = paid_amount
      if (denial_reason !== undefined) updates.denial_reason = denial_reason
      if (denial_code !== undefined) updates.denial_code = denial_code
      if (internal_notes !== undefined) updates.internal_notes = internal_notes
      if (provider_notes !== undefined) updates.provider_notes = provider_notes
      if (submission_method !== undefined) updates.submission_method = submission_method
      if (confirmation_number !== undefined) updates.confirmation_number = confirmation_number
      if (payment_method !== undefined) updates.payment_method = payment_method
      if (payment_reference !== undefined) updates.payment_reference = payment_reference

      // Set processed_by if approving/denying
      if (status && ['approved', 'partially_approved', 'denied'].includes(status)) {
        updates.processed_by = user.id
      }

      const { data: claim, error } = await supabase
        .from('insurance_claims')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Audit log
      const { logAudit } = await import('@/lib/audit')
      await logAudit('UPDATE_INSURANCE_CLAIM', `insurance_claims/${id}`, {
        updates: Object.keys(updates),
        new_status: status,
      })

      return NextResponse.json(claim)
    } catch (e) {
      logger.error('Error updating claim', {
        tenantId: profile.tenant_id,
        userId: user.id,
        claimId: id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
