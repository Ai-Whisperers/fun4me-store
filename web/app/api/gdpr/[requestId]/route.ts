/**
 * GDPR Request Details API
 *
 * COMP-001: Get, update, or cancel specific GDPR request
 *
 * GET /api/gdpr/[requestId] - Get request details
 * PATCH /api/gdpr/[requestId] - Update request
 * DELETE /api/gdpr/[requestId] - Cancel request
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

interface RouteParams {
  params: Promise<{ requestId: string }>
}

/**
 * Update schema
 */
const updateSchema = z.object({
  notes: z.string().optional(),
})

/**
 * GET /api/gdpr/[requestId]
 * Get specific GDPR request details
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { requestId } = await params
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Get GDPR request
    const { data: gdprRequest, error } = await supabase
      .from('gdpr_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', user.id)
      .single()

    if (error || !gdprRequest) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      )
    }

    // Get compliance logs for this request
    const { data: logs } = await supabase
      .from('gdpr_compliance_logs')
      .select('action, details, performed_at')
      .eq('request_id', requestId)
      .order('performed_at', { ascending: false })

    return NextResponse.json({
      request: gdprRequest,
      logs: logs || [],
    })
  } catch (error) {
    logger.error('Error in GET /api/gdpr/[requestId]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/gdpr/[requestId]
 * Update GDPR request (limited to notes for users)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { requestId } = await params
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = updateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    // Verify request exists and belongs to user
    const { data: existing } = await supabase
      .from('gdpr_requests')
      .select('id, status')
      .eq('id', requestId)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      )
    }

    // Only allow updates to pending/verification requests
    if (!['pending', 'identity_verification'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'Esta solicitud ya no puede ser modificada' },
        { status: 409 }
      )
    }

    // Update request
    const { data: updated, error: updateError } = await supabase
      .from('gdpr_requests')
      .update({
        notes: validation.data.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating GDPR request:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar solicitud' },
        { status: 500 }
      )
    }

    return NextResponse.json({ request: updated })
  } catch (error) {
    logger.error('Error in PATCH /api/gdpr/[requestId]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/gdpr/[requestId]
 * Cancel a GDPR request (only for pending/verification status)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { requestId } = await params
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verify request exists and belongs to user
    const { data: existing } = await supabase
      .from('gdpr_requests')
      .select('id, status, tenant_id')
      .eq('id', requestId)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      )
    }

    // Only allow cancellation of pending/verification requests
    if (!['pending', 'identity_verification'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'Esta solicitud ya no puede ser cancelada' },
        { status: 409 }
      )
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('gdpr_requests')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        notes: 'Cancelado por el usuario',
      })
      .eq('id', requestId)

    if (updateError) {
      logger.error('Error cancelling GDPR request:', updateError)
      return NextResponse.json(
        { error: 'Error al cancelar solicitud' },
        { status: 500 }
      )
    }

    // Log cancellation
    await supabase.from('gdpr_compliance_logs').insert({
      request_id: requestId,
      user_id: user.id,
      tenant_id: existing.tenant_id,
      action: 'request_cancelled',
      details: { cancelled_by: 'user' },
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: 'Solicitud cancelada exitosamente',
    })
  } catch (error) {
    logger.error('Error in DELETE /api/gdpr/[requestId]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
