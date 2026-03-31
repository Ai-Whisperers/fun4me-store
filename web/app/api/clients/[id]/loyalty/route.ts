import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/clients/[id]/loyalty
 * Get loyalty points and transactions for a client
 */
export const GET = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const clientId = params.id
    const { searchParams } = new URL(request.url)
    const clinic = searchParams.get('clinic') || profile.tenant_id

    try {
      // Get loyalty points balance
      const { data: loyalty, error: loyaltyError } = await supabase
        .from('loyalty_points')
        .select('balance, lifetime_earned, tier')
        .eq('client_id', clientId)
        .eq('tenant_id', clinic)
        .single()

      if (loyaltyError && loyaltyError.code !== 'PGRST116') {
        // PGRST116 is 'no rows returned', which is fine
        throw loyaltyError
      }

      // Get recent transactions
      const { data: transactions, error: txError } = await supabase
        .from('loyalty_transactions')
        .select('id, points, description, type, created_at')
        .eq('client_id', clientId)
        .eq('tenant_id', clinic)
        .order('created_at', { ascending: false })
        .limit(20)

      if (txError) throw txError

      return NextResponse.json({
        balance: loyalty?.balance || 0,
        lifetime_earned: loyalty?.lifetime_earned || 0,
        tier: loyalty?.tier || 'bronze',
        transactions: transactions || [],
      })
    } catch (e) {
      logger.error('Error fetching client loyalty data', {
        tenantId: profile.tenant_id,
        clientId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }
)

/**
 * POST /api/clients/[id]/loyalty
 * Add or deduct loyalty points (staff only)
 * BIZ-007: Prevents negative balance using atomic RPC
 */
export const POST = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const clientId = params.id

    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const { points, description, type } = body

    if (points === undefined || typeof points !== 'number') {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['points (number)'] },
      })
    }

    try {
      // Use atomic RPC function to adjust points
      // This handles:
      // 1. Row locking
      // 2. Balance check (prevent negative)
      // 3. Transaction insertion
      // 4. Trigger-based balance update
      const { data, error } = await supabase.rpc('adjust_loyalty_points', {
        p_tenant_id: profile.tenant_id,
        p_client_id: clientId,
        p_points: points,
        p_description: description || (points > 0 ? 'Ajuste manual' : 'Canje manual'),
        p_type: type || (points > 0 ? 'adjust' : 'redeem'),
        p_created_by: user.id,
      })

      if (error) {
        // Handle custom exception from RPC
        if (error.code === 'P0001') {
          return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
            details: { message: error.message },
          })
        }
        throw error
      }

      const result = data as {
        success: boolean
        new_balance: number
        transaction_id: string
      }

      return NextResponse.json({
        success: true,
        newBalance: result.new_balance,
        transactionId: result.transaction_id,
      })
    } catch (e) {
      logger.error('Error updating client loyalty points', {
        tenantId: profile.tenant_id,
        clientId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
