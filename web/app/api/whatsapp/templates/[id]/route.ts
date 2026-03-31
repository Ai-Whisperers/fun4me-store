import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z
    .enum(['appointment_reminder', 'vaccine_reminder', 'general', 'promotional', 'follow_up'])
    .optional(),
  content: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
})

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Staff check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['vet', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Solo personal autorizado' }, { status: 403 })
    }

    const { data: template, error } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error || !template) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ data: template })
  } catch (error) {
    logger.error('Template API GET error', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Admin only
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }

    // Parse and validate body
    const body = await request.json()
    const validation = updateTemplateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    // Verify template exists and belongs to tenant
    const { data: existing } = await supabase
      .from('whatsapp_templates')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    // Check for duplicate name if name is being updated
    if (validation.data.name) {
      const { data: duplicate } = await supabase
        .from('whatsapp_templates')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('name', validation.data.name)
        .neq('id', id)
        .single()

      if (duplicate) {
        return NextResponse.json(
          { error: 'Ya existe una plantilla con este nombre' },
          { status: 400 }
        )
      }
    }

    const { data: template, error } = await supabase
      .from('whatsapp_templates')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating template', {
        error: error.message,
        templateId: id,
        tenantId: profile.tenant_id,
        userId: user.id,
      })
      return NextResponse.json({ error: 'Error al actualizar plantilla' }, { status: 500 })
    }

    return NextResponse.json({ data: template })
  } catch (error) {
    logger.error('Template API PATCH error', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Admin only
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }

    // Verify template exists and belongs to tenant
    const { data: existing } = await supabase
      .from('whatsapp_templates')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    const { error } = await supabase.from('whatsapp_templates').delete().eq('id', id)

    if (error) {
      logger.error('Error deleting template', {
        error: error.message,
        templateId: id,
        tenantId: profile.tenant_id,
        userId: user.id,
      })
      return NextResponse.json({ error: 'Error al eliminar plantilla' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Template API DELETE error', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
