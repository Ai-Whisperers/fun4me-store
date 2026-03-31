'use server'

import { withActionAuth } from '@/lib/auth'
import { actionSuccess, actionError } from '@/lib/errors'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

/**
 * Get conversations for current user or staff
 */
export const getConversations = withActionAuth(
  async (
    { user, profile, supabase },
    clinicSlug: string,
    params: {
      status?: string
      search?: string
    }
  ) => {
    const isStaff = ['vet', 'admin'].includes(profile.role)
    const { status, search } = params

    // Since direct joins on complex logic might be tricky with RPC or multiple queries,
    // we'll use a direct query. In production, this should be an RPC for performance.

    let query = supabase
      .from('conversations')
      .select(
        `
        *,
        client:profiles!conversations_client_id_fkey (id, full_name),
        staff:profiles!conversations_assigned_to_fkey (id, full_name)
      `
      )
      .eq('tenant_id', clinicSlug)

    // Authorization: Clients only see their own, staff see all in tenant
    if (!isStaff) {
      query = query.eq('client_id', user.id)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.ilike('subject', `%${search}%`)
    }

    const { data, error } = await query.order('last_message_at', {
      ascending: false,
      nullsFirst: false,
    })

    if (error) {
      logger.error('Failed to get conversations', {
        error,
        tenant: clinicSlug,
        userId: user.id,
      })
      return actionError('Error al obtener conversaciones')
    }

    // Transform to match the UI expectation
    const transformed = data?.map((c) => ({
      ...c,
      client_name: c.client?.full_name || 'Cliente desconocido',
      staff_name: c.staff?.full_name || null,
      unread_count: 0, // Placeholder, unread logic needs separate table/query
    }))

    return actionSuccess(transformed || [])
  }
)

/**
 * Create a new conversation
 */
export const createConversation = withActionAuth(
  async ({ user, supabase }, clinicSlug: string, subject: string, message: string) => {
    // 1. Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        tenant_id: clinicSlug,
        client_id: user.id,
        subject,
        status: 'open',
      })
      .select()
      .single()

    if (convError || !conversation) {
      logger.error('Failed to create conversation', {
        error: convError,
        tenant: clinicSlug,
        userId: user.id,
      })
      return actionError('Error al crear la conversación')
    }

    // 2. Create first message
    const { error: msgError } = await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      content: message,
      tenant_id: clinicSlug,
    })

    if (msgError) {
      logger.error('Failed to create first message', {
        error: msgError,
        tenant: clinicSlug,
        userId: user.id,
        conversationId: conversation.id,
      })
      return actionError('Error al enviar el primer mensaje')
    }

    revalidatePath(`/${clinicSlug}/portal/messages`)
    return actionSuccess(conversation)
  }
)
