/**
 * Platform Admin - Adjust Commission
 *
 * POST /api/platform/commissions/[id]/adjust
 *
 * Body:
 * {
 *   adjustment_amount: number (positive or negative)
 *   reason: string (required)
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const adjustSchema = z.object({
  adjustment_amount: z.number().refine((n) => n !== 0, 'El ajuste no puede ser cero'),
  reason: z.string().min(10, 'La razón debe tener al menos 10 caracteres'),
})

async function isPlatformAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return profile?.role === 'platform_admin'
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id: commissionId } = await params
  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // 2. Platform admin check
  const isAdmin = await isPlatformAdmin(supabase, user.id)
  if (!isAdmin) {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { message: 'Acceso restringido a administradores de plataforma' },
    })
  }

  try {
    // Parse and validate body
    const body = await request.json()
    const validation = adjustSchema.safeParse(body)

    if (!validation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        field_errors: validation.error.flatten().fieldErrors as Record<string, string[]>,
      })
    }

    const { adjustment_amount, reason } = validation.data

    // Get commission
    const { data: commission, error: fetchError } = await supabase
      .from('store_commissions')
      .select('id, status, commission_amount, original_commission, tenant_id')
      .eq('id', commissionId)
      .single()

    if (fetchError || !commission) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'commission', message: 'Comisión no encontrada' },
      })
    }

    // Check status
    if (commission.status === 'paid') {
      return apiError('CONFLICT', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'No se puede ajustar una comisión ya pagada' },
      })
    }

    if (commission.status === 'waived') {
      return apiError('CONFLICT', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'No se puede ajustar una comisión exonerada' },
      })
    }

    // Calculate new amount
    const currentAmount = Number(commission.commission_amount)
    const newAmount = currentAmount + adjustment_amount

    if (newAmount < 0) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'El ajuste resultaría en una comisión negativa' },
      })
    }

    // Adjust commission
    const { data: updated, error: updateError } = await supabase
      .from('store_commissions')
      .update({
        original_commission: commission.original_commission || currentAmount,
        commission_amount: newAmount,
        adjustment_amount: (Number(commission.original_commission || currentAmount) || 0) +
          adjustment_amount -
          newAmount +
          adjustment_amount,
        adjustment_reason: reason,
        adjusted_by: user.id,
        adjusted_at: new Date().toISOString(),
        status: 'adjusted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', commissionId)
      .select()
      .single()

    if (updateError) throw updateError

    // Log audit
    const { error: auditError } = await supabase.from('audit_logs').insert({
      tenant_id: commission.tenant_id,
      user_id: user.id,
      action: 'commission_adjusted',
      resource: 'store_commissions',
      resource_id: commissionId,
      details: {
        reason,
        original_amount: currentAmount,
        adjustment: adjustment_amount,
        new_amount: newAmount,
      },
    })

    if (auditError) {
      logger.warn('Failed to log commission adjustment audit', { commissionId, error: auditError.message })
    }

    logger.info('Commission adjusted by platform admin', {
      commissionId,
      tenantId: commission.tenant_id,
      adminId: user.id,
      originalAmount: currentAmount,
      adjustment: adjustment_amount,
      newAmount,
      reason,
    })

    return NextResponse.json({
      success: true,
      commission: updated,
      message: `Comisión ajustada de ${currentAmount.toLocaleString()} a ${newAmount.toLocaleString()}`,
    })
  } catch (e) {
    logger.error('Platform admin: Error adjusting commission', {
      commissionId,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al ajustar comisión' },
    })
  }
}
