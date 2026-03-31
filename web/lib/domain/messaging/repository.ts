/**
 * Messaging Repository
 *
 * Data access layer for conversations, messages, and templates.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Conversation,
  ConversationFilters,
  CreateConversationInput,
  ConversationStatus,
  ConversationPriority,
  Message,
  MessageFilters,
  SendMessageInput,
  MessageTemplate,
  TemplateFilters,
  CreateTemplateInput,
  UpdateTemplateInput,
} from './types'

export class MessagingRepository {
  constructor(private supabase: SupabaseClient) {}

  // ===========================================================================
  // CONVERSATIONS
  // ===========================================================================

  async findConversations(
    tenantId: string,
    filters: ConversationFilters = {}
  ): Promise<Conversation[]> {
    let query = this.supabase
      .from('conversations')
      .select(
        `
        *,
        client:profiles!client_id(id, full_name, email),
        pet:pets(id, name)
      `
      )
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }

    if (filters.channel) {
      query = query.eq('channel', filters.channel)
    }

    if (filters.client_id) {
      query = query.eq('client_id', filters.client_id)
    }

    if (filters.pet_id) {
      query = query.eq('pet_id', filters.pet_id)
    }

    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to)
    }

    if (filters.unassigned) {
      query = query.is('assigned_to', null)
    }

    if (filters.has_unread) {
      query = query.gt('unread_staff_count', 0)
    }

    if (filters.search) {
      query = query.ilike('subject', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error al cargar conversaciones: ${error.message}`)
    return (data || []) as Conversation[]
  }

  async findConversationById(
    conversationId: string,
    tenantId: string
  ): Promise<Conversation | null> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select(
        `
        *,
        client:profiles!client_id(id, full_name, email, phone),
        pet:pets(id, name, species, breed),
        assigned:profiles!assigned_to(id, full_name)
      `
      )
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Error al cargar conversación: ${error.message}`)
    }

    return data as Conversation
  }

  async createConversation(tenantId: string, input: CreateConversationInput): Promise<Conversation> {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        tenant_id: tenantId,
        client_id: input.client_id,
        pet_id: input.pet_id,
        subject: input.subject,
        channel: input.channel || 'in_app',
        priority: input.priority || 'normal',
        appointment_id: input.appointment_id,
        tags: input.tags,
        status: 'open',
      })
      .select(
        `
        *,
        client:profiles!client_id(id, full_name, email)
      `
      )
      .single()

    if (error) throw new Error(`Error al crear conversación: ${error.message}`)
    return data as Conversation
  }

  async updateConversationStatus(
    conversationId: string,
    tenantId: string,
    status: ConversationStatus
  ): Promise<Conversation> {
    const { data, error } = await this.supabase
      .from('conversations')
      .update({ status })
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw new Error(`Error al actualizar estado: ${error.message}`)
    return data as Conversation
  }

  async updateConversationAssignment(
    conversationId: string,
    tenantId: string,
    assignedTo: string | null
  ): Promise<Conversation> {
    const { data, error } = await this.supabase
      .from('conversations')
      .update({
        assigned_to: assignedTo,
        assigned_at: assignedTo ? new Date().toISOString() : null,
      })
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw new Error(`Error al asignar conversación: ${error.message}`)
    return data as Conversation
  }

  async updateConversationPriority(
    conversationId: string,
    tenantId: string,
    priority: ConversationPriority
  ): Promise<Conversation> {
    const { data, error } = await this.supabase
      .from('conversations')
      .update({ priority })
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw new Error(`Error al actualizar prioridad: ${error.message}`)
    return data as Conversation
  }

  // ===========================================================================
  // MESSAGES
  // ===========================================================================

  async findMessages(
    conversationId: string,
    tenantId: string,
    filters: MessageFilters = {},
    limit: number = 50
  ): Promise<Message[]> {
    let query = this.supabase
      .from('messages')
      .select(
        `
        *,
        sender:profiles!sender_id(id, full_name)
      `
      )
      .eq('conversation_id', conversationId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (filters.sender_type) {
      query = query.eq('sender_type', filters.sender_type)
    }

    if (filters.message_type) {
      query = query.eq('message_type', filters.message_type)
    }

    if (filters.from_date) {
      query = query.gte('created_at', filters.from_date)
    }

    if (filters.to_date) {
      query = query.lte('created_at', filters.to_date)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error al cargar mensajes: ${error.message}`)
    return (data || []) as Message[]
  }

  async createMessage(
    conversationId: string,
    tenantId: string,
    input: SendMessageInput
  ): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        tenant_id: tenantId,
        sender_id: input.sender_id,
        sender_type: input.sender_type,
        sender_name: input.sender_name,
        message_type: input.message_type || 'text',
        content: input.content,
        content_html: input.content_html,
        attachments: input.attachments || [],
        card_data: input.card_data,
        reply_to_id: input.reply_to_id,
        metadata: input.metadata || {},
        status: 'sent',
      })
      .select(
        `
        *,
        sender:profiles!sender_id(id, full_name)
      `
      )
      .single()

    if (error) throw new Error(`Error al enviar mensaje: ${error.message}`)
    return data as Message
  }

  async markConversationRead(
    conversationId: string,
    userType: 'client' | 'staff'
  ): Promise<void> {
    const { error } = await this.supabase.rpc('mark_conversation_read', {
      p_conversation_id: conversationId,
      p_user_type: userType,
    })

    if (error) throw new Error(`Error al marcar como leído: ${error.message}`)
  }

  async getUnreadCount(tenantId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('unread_staff_count')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .neq('status', 'closed')
      .neq('status', 'spam')

    if (error) throw new Error(`Error al obtener mensajes no leídos: ${error.message}`)

    return data?.reduce((sum, c) => sum + (c.unread_staff_count || 0), 0) || 0
  }

  // ===========================================================================
  // TEMPLATES
  // ===========================================================================

  async findTemplates(tenantId: string, filters: TemplateFilters = {}): Promise<MessageTemplate[]> {
    let query = this.supabase
      .from('message_templates')
      .select('*')
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .is('deleted_at', null)
      .order('name')

    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.channel) {
      query = query.contains('channels', [filters.channel])
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error al cargar plantillas: ${error.message}`)
    return (data || []) as MessageTemplate[]
  }

  async findTemplateByCode(code: string, tenantId: string): Promise<MessageTemplate | null> {
    const { data, error } = await this.supabase
      .from('message_templates')
      .select('*')
      .eq('code', code)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .is('deleted_at', null)
      .order('tenant_id', { ascending: false, nullsFirst: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Error al obtener plantilla: ${error.message}`)
    }

    return data as MessageTemplate
  }

  async createTemplate(tenantId: string, input: CreateTemplateInput): Promise<MessageTemplate> {
    const { data, error } = await this.supabase
      .from('message_templates')
      .insert({
        tenant_id: tenantId,
        code: input.code,
        name: input.name,
        category: input.category,
        subject: input.subject,
        content: input.content,
        content_html: input.content_html,
        variables: input.variables,
        channels: input.channels || ['in_app'],
        language: input.language || 'es',
        is_active: true,
      })
      .select()
      .single()

    if (error) throw new Error(`Error al crear plantilla: ${error.message}`)
    return data as MessageTemplate
  }

  async updateTemplate(
    templateId: string,
    tenantId: string,
    updates: UpdateTemplateInput
  ): Promise<MessageTemplate> {
    const { data, error } = await this.supabase
      .from('message_templates')
      .update(updates)
      .eq('id', templateId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw new Error(`Error al actualizar plantilla: ${error.message}`)
    return data as MessageTemplate
  }

  async softDeleteTemplate(templateId: string, tenantId: string, deletedBy: string): Promise<void> {
    const { error } = await this.supabase
      .from('message_templates')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
      })
      .eq('id', templateId)
      .eq('tenant_id', tenantId)

    if (error) throw new Error(`Error al eliminar plantilla: ${error.message}`)
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  async getConversationsForStats(
    tenantId: string
  ): Promise<
    Array<{
      status: string
      unread_staff_count: number
      created_at: string
      last_staff_message_at: string | null
      last_client_message_at: string | null
    }>
  > {
    const { data, error } = await this.supabase
      .from('conversations')
      .select(
        'status, unread_staff_count, created_at, last_staff_message_at, last_client_message_at'
      )
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) throw new Error(`Error al obtener estadísticas: ${error.message}`)
    return data || []
  }

  async getMessageCountForDate(tenantId: string, fromDate: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', fromDate)

    if (error) throw new Error(`Error al contar mensajes: ${error.message}`)
    return count || 0
  }
}
