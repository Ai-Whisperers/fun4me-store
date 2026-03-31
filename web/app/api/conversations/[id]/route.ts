import { NextResponse } from 'next/server'
import { withApiAuthParams } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { z } from 'zod'

type Params = { id: string }

const conversationMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const updateConversationSchema = z.object({
  status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assigned_to: z.string().uuid().optional(),
  subject: z.string().max(200).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'Al menos un campo debe ser proporcionado'
)

// GET /api/conversations/[id] - Get conversation with messages
export const GET = withApiAuthParams<Params>(async (ctx) => {
  const { id } = ctx.params
  const { supabase, user, profile, log } = ctx
  const isStaff = ['vet', 'admin'].includes(profile.role)

  try {
    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(
        `
        *,
        client:profiles!conversations_client_id_fkey(id, full_name, email, phone, avatar_url),
        pet:pets(id, name, species, photo_url),
        assigned_staff:profiles!conversations_assigned_to_fkey(id, full_name, avatar_url)
      `
      )
      .eq('id', id)
      .single()

    if (convError) throw convError

    if (!conversation) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { message: 'Conversación no encontrada' },
      })
    }

    // Check access
    if (!isStaff && conversation.client_id !== user.id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'No tienes acceso a esta conversación' },
      })
    }

    // Get messages
    const { searchParams } = new URL(ctx.request.url)
    
    const queryResult = conversationMessagesQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    })

    if (!queryResult.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { issues: queryResult.error.issues },
      })
    }

    const { page, limit } = queryResult.data
    const offset = (page - 1) * limit

    const {
      data: messages,
      error: msgError,
      count,
    } = await supabase
      .from('messages')
      .select(
        `
        id, content, content_type, attachment_url, attachment_type, is_internal, created_at,
        sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, role)
      `,
        { count: 'exact' }
      )
      .eq('conversation_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (msgError) throw msgError

    // Filter internal messages for non-staff
    const filteredMessages = isStaff ? messages : messages?.filter((m) => !m.is_internal)

    // Mark as read
    const unreadField = isStaff ? 'unread_count_staff' : 'unread_count_client'
    await supabase
      .from('conversations')
      .update({ [unreadField]: 0 })
      .eq('id', id)

    return NextResponse.json({
      conversation,
      messages: filteredMessages,
      total_messages: count || 0,
      page,
      limit,
    })
  } catch (e) {
    log.error('Error loading conversation', {
      conversationId: id,
      error: e instanceof Error ? e.message : String(e),
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar conversación' },
    })
  }
})

// PATCH /api/conversations/[id] - Update conversation
export const PATCH = withApiAuthParams<Params>(
  async (ctx) => {
    const { id } = ctx.params
    const { supabase, profile, log, request } = ctx

    try {
      const body = await request.json()
      const result = updateConversationSchema.safeParse(body)

      if (!result.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { issues: result.error.issues },
        })
      }

      const updates: {
        status?: string
        priority?: string
        assigned_to?: string
        subject?: string
        closed_at?: string
      } = result.data

      // If closing, set closed_at
      if (updates.status === 'closed') {
        updates.closed_at = new Date().toISOString()
      }

      const { data: updated, error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json(updated)
    } catch (e) {
      log.error('Error updating conversation', {
        conversationId: id,
        error: e instanceof Error ? e.message : String(e),
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al actualizar conversación' },
      })
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

// DELETE /api/conversations/[id] - Soft delete conversation
export const DELETE = withApiAuthParams<Params>(
  async (ctx) => {
    const { id } = ctx.params
    const { supabase, user, profile, log } = ctx

    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)

      if (error) throw error

      return NextResponse.json({ success: true })
    } catch (e) {
      log.error('Error deleting conversation', {
        conversationId: id,
        error: e instanceof Error ? e.message : String(e),
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al eliminar conversación' },
      })
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
