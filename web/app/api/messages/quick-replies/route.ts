import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createQuickReplySchema, deleteQuickReplyQuerySchema } from '@/lib/schemas/message'

// GET /api/messages/quick-replies - List quick replies for current user
export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role)) {
    return NextResponse.json(
      { error: 'Solo el personal puede usar respuestas rápidas' },
      { status: 403 }
    )
  }

  try {
    const { data: quickReplies, error } = await supabase
      .from('quick_replies')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .or(`user_id.eq.${user.id},is_shared.eq.true`)
      .order('usage_count', { ascending: false })

    if (error) throw error

    return NextResponse.json(quickReplies)
  } catch (e) {
    logger.error('Error loading quick replies', {
      userId: user.id,
      tenantId: profile.tenant_id,
      error: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json({ error: 'Error al cargar respuestas rápidas' }, { status: 500 })
  }
}

// POST /api/messages/quick-replies - Create quick reply
export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role)) {
    return NextResponse.json(
      { error: 'Solo el personal puede crear respuestas rápidas' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    
    // Validate input with Zod
    const validation = createQuickReplySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validación fallida', issues: validation.error.issues },
        { status: 400 }
      )
    }

    const { shortcut, content, is_shared } = validation.data

    // Check for duplicate shortcut
    const { data: existing } = await supabase
      .from('quick_replies')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('shortcut', shortcut)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Ya existe una respuesta con ese atajo' }, { status: 400 })
    }

    const { data: quickReply, error } = await supabase
      .from('quick_replies')
      .insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        shortcut,
        content,
        is_shared: profile.role === 'admin' ? is_shared || false : false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(quickReply, { status: 201 })
  } catch (e) {
    logger.error('Error creating quick reply', {
      userId: user.id,
      tenantId: profile.tenant_id,
      error: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json({ error: 'Error al crear respuesta rápida' }, { status: 500 })
  }
}

// DELETE /api/messages/quick-replies - Delete quick reply
export async function DELETE(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  
  // Validate query params
  const queryValidation = deleteQuickReplyQuerySchema.safeParse({
    id: searchParams.get('id'),
  })
  
  if (!queryValidation.success) {
    return NextResponse.json(
      { error: 'ID inválido', issues: queryValidation.error.issues },
      { status: 400 }
    )
  }
  
  const { id } = queryValidation.data

  try {
    const { error } = await supabase
      .from('quick_replies')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    logger.error('Error deleting quick reply', {
      userId: user.id,
      quickReplyId: id,
      error: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json({ error: 'Error al eliminar respuesta rápida' }, { status: 500 })
  }
}
