import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/store/subscriptions/[id]/skip
 * Skip the next order for a subscription
 */
export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  try {
    // Get current subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('store_subscriptions')
      .select('id, next_order_date, frequency_days, status')
      .eq('id', id)
      .eq('customer_id', user.id)
      .single()

    if (fetchError || !subscription) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { message: 'Suscripción no encontrada' },
      })
    }

    if (subscription.status !== 'active') {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Solo se pueden saltar pedidos en suscripciones activas' },
      })
    }

    // Calculate new next order date (skip by adding frequency)
    const currentNextDate = new Date(subscription.next_order_date)
    const newNextDate = new Date(currentNextDate)
    newNextDate.setDate(newNextDate.getDate() + subscription.frequency_days)

    // Update subscription
    const { data: updated, error: updateError } = await supabase
      .from('store_subscriptions')
      .update({
        next_order_date: newNextDate.toISOString().split('T')[0],
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log the skip event
    await supabase.from('store_subscription_history').insert({
      subscription_id: id,
      event_type: 'skipped',
      event_data: {
        skipped_date: subscription.next_order_date,
        new_date: newNextDate.toISOString().split('T')[0],
      },
    })

    logger.info('Subscription order skipped', {
      subscriptionId: id,
      userId: user.id,
      skippedDate: subscription.next_order_date,
      newDate: newNextDate.toISOString().split('T')[0],
    })

    return NextResponse.json({
      success: true,
      subscription: {
        id: updated.id,
        next_order_date: updated.next_order_date,
      },
      message: `Pedido saltado. Próximo pedido: ${newNextDate.toLocaleDateString('es-PY')}`,
    })
  } catch (e) {
    logger.error('Error skipping subscription order', {
      subscriptionId: id,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al saltar pedido' },
    })
  }
}
