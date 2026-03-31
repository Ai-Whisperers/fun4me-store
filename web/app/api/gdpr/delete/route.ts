/**
 * GDPR Account Deletion API
 *
 * COMP-001: Article 17 (Right to Erasure / Right to be Forgotten)
 *
 * POST /api/gdpr/delete - Request account deletion
 * DELETE /api/gdpr/delete - Execute account deletion (after verification)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import {
  canDeleteUser,
  deleteUserData,
  logGDPRDeletion,
  verifyPassword,
  isIdentityVerified,
  sendVerificationEmail,
} from '@/lib/gdpr'
import { logger } from '@/lib/utils/logger'

/**
 * Request schema for deletion
 */
const deleteRequestSchema = z.object({
  password: z.string().min(1, 'Contraseña requerida'),
  confirmDeletion: z.boolean().refine(val => val === true, {
    message: 'Debe confirmar la eliminación',
  }),
})

/**
 * POST /api/gdpr/delete
 * Request account deletion with password verification
 */
export async function POST(request: NextRequest) {
  try {
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
    const validation = deleteRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { password } = validation.data

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      )
    }

    // Verify password
    const passwordValid = await verifyPassword(user.id, password)
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 403 }
      )
    }

    // Check for blockers (unpaid invoices, pending appointments, etc.)
    const { canDelete, blockers } = await canDeleteUser(user.id, profile.tenant_id)

    if (!canDelete) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar la cuenta',
          blockers,
        },
        { status: 409 }
      )
    }

    // Check for existing pending deletion request
    const { data: existingRequest } = await supabase
      .from('gdpr_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('request_type', 'erasure')
      .in('status', ['pending', 'identity_verification', 'processing'])
      .limit(1)

    if (existingRequest && existingRequest.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe una solicitud de eliminación pendiente' },
        { status: 409 }
      )
    }

    // Create deletion request
    const { data: gdprRequest, error: createError } = await supabase
      .from('gdpr_requests')
      .insert({
        user_id: user.id,
        tenant_id: profile.tenant_id,
        request_type: 'erasure',
        status: 'pending',
        notes: 'Solicitud de eliminación de cuenta',
      })
      .select()
      .single()

    if (createError) {
      logger.error('Error creating deletion request:', createError)
      return NextResponse.json(
        { error: 'Error al crear solicitud de eliminación' },
        { status: 500 }
      )
    }

    // Send verification email
    try {
      await sendVerificationEmail(user.id, gdprRequest.id, 'erasure')
    } catch (emailError) {
      logger.error('Error sending verification email:', emailError)
    }

    return NextResponse.json({
      requestId: gdprRequest.id,
      status: 'identity_verification',
      message: 'Se ha enviado un email de verificación. Confirma tu identidad para completar la eliminación.',
      estimatedCompletionDays: 30,
    })
  } catch (error) {
    logger.error('Error in POST /api/gdpr/delete:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/gdpr/delete
 * Execute account deletion (requires prior verification)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Get request ID from query params
    const requestId = request.nextUrl.searchParams.get('request')
    if (!requestId) {
      return NextResponse.json(
        { error: 'ID de solicitud requerido' },
        { status: 400 }
      )
    }

    // Verify identity was confirmed
    const verified = await isIdentityVerified(requestId)
    if (!verified) {
      return NextResponse.json(
        { error: 'Verificación de identidad pendiente' },
        { status: 403 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      )
    }

    // Verify request belongs to user
    const { data: gdprRequest } = await supabase
      .from('gdpr_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', user.id)
      .eq('request_type', 'erasure')
      .single()

    if (!gdprRequest) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      )
    }

    if (gdprRequest.status === 'completed') {
      return NextResponse.json(
        { error: 'Esta solicitud ya fue procesada' },
        { status: 409 }
      )
    }

    // Final check for blockers
    const { canDelete, blockers } = await canDeleteUser(user.id, profile.tenant_id)
    if (!canDelete) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar la cuenta',
          blockers,
        },
        { status: 409 }
      )
    }

    // Execute deletion
    const result = await deleteUserData(user.id, profile.tenant_id)

    // Log compliance
    await logGDPRDeletion(requestId, user.id, profile.tenant_id, result)

    // Update request status
    await supabase
      .from('gdpr_requests')
      .update({
        status: result.success ? 'completed' : 'rejected',
        completed_at: new Date().toISOString(),
        notes: result.success
          ? 'Cuenta eliminada exitosamente'
          : `Error: ${result.errors.map(e => e.error).join(', ')}`,
      })
      .eq('id', requestId)

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Error parcial en la eliminación',
          details: result,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cuenta eliminada exitosamente',
      details: {
        deletedCategories: result.deletedCategories,
        anonymizedCategories: result.anonymizedCategories,
        retainedCategories: result.retainedCategories,
      },
    })
  } catch (error) {
    logger.error('Error in DELETE /api/gdpr/delete:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
