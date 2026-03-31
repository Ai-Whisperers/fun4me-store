/**
 * Referral Code API
 *
 * GET /api/referrals/code - Get tenant's referral code (creates one if doesn't exist)
 * POST /api/referrals/code - Create a new referral code (deactivates old one)
 *
 * Uses scoped queries for automatic tenant isolation.
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

export const GET = withApiAuth(
  async ({ profile, supabase }: ApiHandlerContext): Promise<NextResponse> => {
    try {
      // Ensure referral code exists (creates if not)
      const { data: codeId, error: ensureError } = await supabase.rpc('ensure_referral_code', {
        p_tenant_id: profile.tenant_id,
      })

      if (ensureError) {
        logger.error('Error ensuring referral code', { error: ensureError })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Get the code details
      const { data: code, error: codeError } = await supabase
        .from('referral_codes')
        .select(
          `
        id,
        code,
        is_active,
        times_used,
        max_uses,
        referrer_discount_percent,
        referred_trial_bonus_days,
        referrer_loyalty_points,
        referred_loyalty_points,
        created_at,
        expires_at
      `
        )
        .eq('id', codeId)
        .single()

      if (codeError || !code) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, { details: { resource: 'referral_code' } })
      }

      // Generate shareable URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://Vetic.com'
      const shareUrl = `${baseUrl}/signup?ref=${code.code}`

      return NextResponse.json({
        ...code,
        share_url: shareUrl,
        share_message: `¡Únete a Vetic usando mi código ${code.code} y obtén ${code.referred_trial_bonus_days} días extra de prueba! ${shareUrl}`,
      })
    } catch (e) {
      logger.error('Error getting referral code', {
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : String(e),
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }
)

export const POST = withApiAuth(
  async ({ profile, supabase, scoped }: ApiHandlerContext): Promise<NextResponse> => {
    try {
      // Deactivate existing codes using scoped.update()
      await scoped.update('referral_codes', { is_active: false }, (q) => q.eq('is_active', true))

      // Generate new code
      const { data: newCode, error: genError } = await supabase.rpc('generate_referral_code', {
        p_tenant_id: profile.tenant_id,
      })

      if (genError) {
        logger.error('Error generating referral code', { error: genError })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Create new code record using scoped.insert() (auto-adds tenant_id)
      const { data: codes, error: createError } = await scoped.insert('referral_codes', {
        code: newCode,
      })

      if (createError || !codes?.[0]) {
        logger.error('Error creating referral code', { error: createError })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      const code = codes[0] as { id: string; code: string; tenant_id: string; is_active: boolean }
      // Type-safe after null check above
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://Vetic.com'
      const shareUrl = `${baseUrl}/signup?ref=${code.code}`

      return NextResponse.json({
        ...code,
        share_url: shareUrl,
        share_message: `¡Únete a Vetic usando mi código ${code.code}! ${shareUrl}`,
      })
    } catch (e) {
      logger.error('Error creating referral code', {
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : String(e),
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
