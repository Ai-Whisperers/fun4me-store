import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const redeemSchema = z.object({
  rewardId: z.string().uuid(),
  petId: z.string().uuid().optional(),
})

/**
 * POST /api/loyalty/redeem
 * Redeem a loyalty reward using the atomic database function
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const parsed = redeemSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: parsed.error.flatten().fieldErrors,
      })
    }

    const { rewardId, petId } = parsed.data

    try {
      // Generate redemption code
      const { data: codeData, error: codeError } = await supabase.rpc('generate_redemption_code')

      if (codeError) {
        logger.error('Failed to generate redemption code', {
          tenantId: profile.tenant_id,
          userId: user.id,
          error: codeError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      const redemptionCode = codeData as string

      // Call the atomic redemption function
      const { data: result, error } = await supabase.rpc('redeem_loyalty_reward', {
        p_tenant_id: profile.tenant_id,
        p_user_id: user.id,
        p_reward_id: rewardId,
        p_pet_id: petId || null,
        p_redemption_code: redemptionCode,
      })

      if (error) {
        logger.error('Redemption RPC failed', {
          tenantId: profile.tenant_id,
          userId: user.id,
          rewardId,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Parse the JSONB result
      const redemptionResult = result as {
        success: boolean
        error?: string
        message?: string
        redemption_id?: string
        redemption_code?: string
        reward_name?: string
        points_spent?: number
        expires_at?: string
        new_balance?: number
        current_balance?: number
        required?: number
      }

      if (!redemptionResult.success) {
        // Map error codes to user-friendly responses
        const errorResponses: Record<string, { status: number; message: string }> = {
          REWARD_NOT_FOUND: { status: 404, message: redemptionResult.message || 'Recompensa no encontrada' },
          NOT_YET_VALID: { status: 400, message: redemptionResult.message || 'Recompensa no disponible aún' },
          EXPIRED: { status: 400, message: redemptionResult.message || 'Recompensa expirada' },
          OUT_OF_STOCK: { status: 400, message: redemptionResult.message || 'Recompensa agotada' },
          MAX_REDEMPTIONS_REACHED: { status: 400, message: redemptionResult.message || 'Límite de canjes alcanzado' },
          NO_PET_FOUND: { status: 400, message: redemptionResult.message || 'No se encontró mascota asociada' },
          INSUFFICIENT_POINTS: {
            status: 400,
            message: redemptionResult.message || 'Puntos insuficientes',
          },
        }

        const errorConfig = errorResponses[redemptionResult.error || ''] || {
          status: 400,
          message: redemptionResult.message || 'Error al canjear',
        }

        logger.warn('Redemption failed', {
          tenantId: profile.tenant_id,
          userId: user.id,
          rewardId,
          error: redemptionResult.error,
          currentBalance: redemptionResult.current_balance,
          required: redemptionResult.required,
        })

        return NextResponse.json(
          {
            error: errorConfig.message,
            code: redemptionResult.error,
            currentBalance: redemptionResult.current_balance,
            required: redemptionResult.required,
          },
          { status: errorConfig.status }
        )
      }

      // Success!
      logger.info('Reward redeemed successfully', {
        tenantId: profile.tenant_id,
        userId: user.id,
        rewardId,
        redemptionId: redemptionResult.redemption_id,
        pointsSpent: redemptionResult.points_spent,
        newBalance: redemptionResult.new_balance,
      })

      return NextResponse.json({
        success: true,
        redemptionId: redemptionResult.redemption_id,
        redemptionCode: redemptionResult.redemption_code,
        rewardName: redemptionResult.reward_name,
        pointsSpent: redemptionResult.points_spent,
        expiresAt: redemptionResult.expires_at,
        newBalance: redemptionResult.new_balance,
      })
    } catch (e) {
      logger.error('Unexpected error in loyalty redemption', {
        tenantId: profile.tenant_id,
        userId: user.id,
        rewardId,
        error: e instanceof Error ? e.message : 'Unknown error',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { rateLimit: 'write' }
)
