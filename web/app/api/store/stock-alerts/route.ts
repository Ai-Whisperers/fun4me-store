import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

// POST - Create stock alert
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let product_id: string | undefined
  let clinic: string | undefined
  let email: string | undefined
  let variant_id: string | undefined

  try {
    const body = await request.json()
    product_id = body.product_id
    clinic = body.clinic
    email = body.email
    variant_id = body.variant_id

    if (!product_id || !clinic || !email) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Faltan parámetros requeridos' },
      })
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Email inválido' },
      })
    }

    // Check if alert already exists
    const { data: existing } = await supabase
      .from('store_stock_alerts')
      .select('id')
      .eq('email', email)
      .eq('product_id', product_id)
      .single()

    if (existing) {
      return apiError('ALREADY_EXISTS', HTTP_STATUS.CONFLICT, {
        details: { message: 'Ya estás suscrito para recibir alertas de este producto' },
      })
    }

    const { data, error } = await supabase
      .from('store_stock_alerts')
      .insert({
        product_id,
        tenant_id: clinic,
        user_id: user?.id || null,
        email,
        variant_id,
        notified: false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, alert: data })
  } catch (e) {
    logger.error('Error creating stock alert', {
      productId: product_id,
      clinic,
      userId: user?.id,
      error: e instanceof Error ? e.message : String(e),
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'No se pudo crear la alerta' },
    })
  }
}

// DELETE - Remove stock alert
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const alertId = searchParams.get('id')
  const email = searchParams.get('email')

  if (!alertId && !email) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { message: 'Falta id o email' },
    })
  }

  const supabase = await createClient()

  try {
    let query = supabase.from('store_stock_alerts').delete()

    if (alertId) {
      query = query.eq('id', alertId)
    } else if (email) {
      query = query.eq('email', email)
    }

    const { error } = await query

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    logger.error('Error deleting stock alert', {
      alertId,
      email,
      error: e instanceof Error ? e.message : String(e),
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'No se pudo eliminar la alerta' },
    })
  }
}
