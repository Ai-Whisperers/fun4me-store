import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * GET /api/staff/time-off/types
 * Fetches available time off types
 * Query params:
 *   - clinic (optional): tenant_id to get tenant-specific types
 *   - include_inactive (optional): include inactive types (for admin)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const clinicSlug = searchParams.get('clinic')
  const includeInactive = searchParams.get('include_inactive') === 'true'

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    // Get global types and tenant-specific types if clinic provided
    let query = supabase.from('time_off_types').select('*').order('name')

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    if (clinicSlug) {
      // Get global (tenant_id IS NULL) and tenant-specific types
      query = query.or(`tenant_id.is.null,tenant_id.eq.${clinicSlug}`)
    } else {
      // Just global types
      query = query.is('tenant_id', null)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching time off types', {
        error: error.message,
        tenantId: clinicSlug,
        userId: user.id,
      })
      return NextResponse.json({ error: 'Error al obtener tipos de ausencia' }, { status: 500 })
    }

    return NextResponse.json({
      data: data || [],
    })
  } catch (e) {
    logger.error('Error in time-off types GET', {
      error: e instanceof Error ? e.message : 'Unknown',
      userId: user?.id,
    })
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/staff/time-off/types
 * Create a new tenant-specific time off type
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Admin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo administradores pueden crear tipos de ausencia' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const {
      code,
      name,
      description,
      is_paid,
      requires_approval,
      max_days_per_year,
      min_notice_days,
      color_code,
    } = body

    if (!code || !name) {
      return NextResponse.json({ error: 'Código y nombre son requeridos' }, { status: 400 })
    }

    // Check for duplicate code
    const { data: existing } = await supabase
      .from('time_off_types')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('code', code.toUpperCase())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un tipo con ese código' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('time_off_types')
      .insert({
        tenant_id: profile.tenant_id,
        code: code.toUpperCase(),
        name,
        description,
        is_paid: is_paid ?? true,
        requires_approval: requires_approval ?? true,
        max_days_per_year: max_days_per_year || null,
        min_notice_days: min_notice_days ?? 1,
        color_code: color_code || '#3B82F6',
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating time off type', {
        error: error.message,
        tenantId: profile.tenant_id,
        userId: user.id,
      })
      return NextResponse.json({ error: 'Error al crear tipo de ausencia' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (e) {
    logger.error('Error in time-off types POST', {
      error: e instanceof Error ? e.message : 'Unknown',
      userId: user?.id,
    })
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * PATCH /api/staff/time-off/types
 * Update a tenant-specific time off type
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Admin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo administradores pueden modificar tipos de ausencia' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Verify type belongs to tenant (can only modify tenant-specific types)
    const { data: existing } = await supabase
      .from('time_off_types')
      .select('id, tenant_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Tipo de ausencia no encontrado' }, { status: 404 })
    }

    if (existing.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: 'No puedes modificar tipos globales' }, { status: 403 })
    }

    // Build update object
    const allowedFields = [
      'name',
      'description',
      'is_paid',
      'requires_approval',
      'max_days_per_year',
      'min_notice_days',
      'color_code',
      'is_active',
    ]
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field]
      }
    }

    const { data, error } = await supabase
      .from('time_off_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating time off type', {
        error: error.message,
        typeId: id,
        tenantId: profile.tenant_id,
        userId: user.id,
      })
      return NextResponse.json({ error: 'Error al actualizar tipo de ausencia' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (e) {
    logger.error('Error in time-off types PATCH', {
      error: e instanceof Error ? e.message : 'Unknown',
      userId: user?.id,
    })
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/staff/time-off/types
 * Delete (deactivate) a tenant-specific time off type
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Admin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo administradores pueden eliminar tipos de ausencia' },
      { status: 403 }
    )
  }

  try {
    // Verify type belongs to tenant
    const { data: existing } = await supabase
      .from('time_off_types')
      .select('id, tenant_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Tipo de ausencia no encontrado' }, { status: 404 })
    }

    if (existing.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: 'No puedes eliminar tipos globales' }, { status: 403 })
    }

    // Check if type is in use
    const { count } = await supabase
      .from('time_off_requests')
      .select('id', { count: 'exact', head: true })
      .eq('time_off_type_id', id)

    if (count && count > 0) {
      // Soft delete - deactivate instead
      const { error } = await supabase
        .from('time_off_types')
        .update({ is_active: false })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: 'Error al desactivar tipo' }, { status: 500 })
      }

      return NextResponse.json({ message: 'Tipo desactivado (tiene solicitudes asociadas)' })
    }

    // Hard delete if not in use
    const { error } = await supabase.from('time_off_types').delete().eq('id', id)

    if (error) {
      logger.error('Error deleting time off type', {
        error: error.message,
        typeId: id,
        tenantId: profile.tenant_id,
        userId: user.id,
      })
      return NextResponse.json({ error: 'Error al eliminar tipo de ausencia' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Tipo eliminado exitosamente' })
  } catch (e) {
    logger.error('Error in time-off types DELETE', {
      error: e instanceof Error ? e.message : 'Unknown',
      userId: user?.id,
    })
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
