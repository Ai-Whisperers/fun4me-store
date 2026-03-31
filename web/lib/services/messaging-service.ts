/**
 * MessagingService - Communication & Messaging Service Layer
 *
 * Handles all messaging operations:
 * - Conversations (threads between clinic and clients)
 * - Messages (individual messages within conversations)
 * - Message templates
 * - Read receipts and status updates
 *
 * @example
 * ```typescript
 * const service = new MessagingService(supabase);
 * const result = await service.listConversations('tenant-123', { status: 'open' });
 * ```
 */

import { BaseService, type ServiceResult } from './base-service';
import type { MessageStatus } from '@/lib/types/status';

// Re-export for consumers
export type { MessageStatus };

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Communication channels
 */
export type MessageChannel = 'in_app' | 'sms' | 'whatsapp' | 'email';

/**
 * Conversation status
 */
export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed' | 'spam';

/**
 * Conversation priority
 */
export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Sender type for messages
 */
export type SenderType = 'client' | 'staff' | 'system' | 'bot';

/**
 * Message content type
 */
export type MessageType =
  | 'text'
  | 'image'
  | 'file'
  | 'audio'
  | 'video'
  | 'location'
  | 'appointment_card'
  | 'invoice_card'
  | 'prescription_card'
  | 'system';

/**
 * Message template category
 */
export type TemplateCategory =
  | 'appointment'
  | 'reminder'
  | 'follow_up'
  | 'marketing'
  | 'transactional'
  | 'welcome'
  | 'feedback'
  | 'custom';

/**
 * Conversation record
 */
export interface Conversation {
  id: string;
  tenant_id: string;
  client_id: string;
  pet_id?: string | null;
  subject?: string | null;
  channel: MessageChannel;
  status: ConversationStatus;
  priority: ConversationPriority;
  assigned_to?: string | null;
  assigned_at?: string | null;
  last_message_at?: string | null;
  last_client_message_at?: string | null;
  last_staff_message_at?: string | null;
  client_last_read_at?: string | null;
  staff_last_read_at?: string | null;
  unread_client_count: number;
  unread_staff_count: number;
  appointment_id?: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
  // Joined data
  client?: { id: string; full_name: string; email: string } | null;
  pet?: { id: string; name: string } | null;
}

/**
 * Message record
 */
export interface Message {
  id: string;
  conversation_id: string;
  tenant_id: string;
  sender_id?: string | null;
  sender_type: SenderType;
  sender_name?: string | null;
  message_type: MessageType;
  content?: string | null;
  content_html?: string | null;
  attachments?: MessageAttachment[] | null;
  card_data?: Record<string, unknown> | null;
  reply_to_id?: string | null;
  status: MessageStatus;
  delivered_at?: string | null;
  read_at?: string | null;
  failed_reason?: string | null;
  external_message_id?: string | null;
  external_channel?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Joined data
  sender?: { id: string; full_name: string } | null;
  reply_to?: Message | null;
}

/**
 * Message attachment
 */
export interface MessageAttachment {
  url: string;
  type: string;
  name?: string;
  size?: number;
}

/**
 * Message template record
 */
export interface MessageTemplate {
  id: string;
  tenant_id?: string | null;
  code: string;
  name: string;
  category: TemplateCategory;
  subject?: string | null;
  content: string;
  content_html?: string | null;
  variables?: string[] | null;
  channels?: MessageChannel[] | null;
  sms_approved: boolean;
  whatsapp_template_id?: string | null;
  language: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a conversation
 */
export interface CreateConversationData {
  client_id: string;
  pet_id?: string;
  subject?: string;
  channel?: MessageChannel;
  priority?: ConversationPriority;
  appointment_id?: string;
  tags?: string[];
  initial_message?: string;
}

/**
 * Input for sending a message
 */
export interface SendMessageData {
  sender_id?: string;
  sender_type: SenderType;
  sender_name?: string;
  message_type?: MessageType;
  content: string;
  content_html?: string;
  attachments?: MessageAttachment[];
  card_data?: Record<string, unknown>;
  reply_to_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input for creating a message template
 */
export interface CreateTemplateData {
  code: string;
  name: string;
  category: TemplateCategory;
  subject?: string;
  content: string;
  content_html?: string;
  variables?: string[];
  channels?: MessageChannel[];
  language?: string;
}

/**
 * Filters for listing conversations
 */
export interface ConversationFilters {
  status?: ConversationStatus;
  priority?: ConversationPriority;
  channel?: MessageChannel;
  client_id?: string;
  pet_id?: string;
  assigned_to?: string;
  unassigned?: boolean;
  has_unread?: boolean;
  search?: string;
}

/**
 * Filters for listing messages
 */
export interface MessageFilters {
  sender_type?: SenderType;
  message_type?: MessageType;
  from_date?: string;
  to_date?: string;
}

/**
 * Filters for listing templates
 */
export interface TemplateFilters {
  category?: TemplateCategory;
  channel?: MessageChannel;
  is_active?: boolean;
  search?: string;
}

// =============================================================================
// MESSAGING SERVICE
// =============================================================================

export class MessagingService extends BaseService {
  // ---------------------------------------------------------------------------
  // CONVERSATIONS
  // ---------------------------------------------------------------------------

  /**
   * List conversations for a tenant
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns List of conversations
   */
  async listConversations(
    tenantId: string,
    filters?: ConversationFilters
  ): Promise<ServiceResult<Conversation[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('conversations')
        .select(`
          *,
          client:profiles!client_id(id, full_name, email),
          pet:pets(id, name)
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters?.channel) {
        query = query.eq('channel', filters.channel);
      }

      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id);
      }

      if (filters?.pet_id) {
        query = query.eq('pet_id', filters.pet_id);
      }

      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      if (filters?.unassigned) {
        query = query.is('assigned_to', null);
      }

      if (filters?.has_unread) {
        query = query.gt('unread_staff_count', 0);
      }

      if (filters?.search) {
        query = query.ilike('subject', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch conversations');
  }

  /**
   * Get a specific conversation
   *
   * @param conversationId - Conversation ID
   * @param tenantId - Tenant ID for access control
   * @returns Conversation record
   */
  async getConversation(
    conversationId: string,
    tenantId: string
  ): Promise<ServiceResult<Conversation | null>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('conversations')
        .select(`
          *,
          client:profiles!client_id(id, full_name, email, phone),
          pet:pets(id, name, species, breed),
          assigned:profiles!assigned_to(id, full_name)
        `)
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    }, 'Failed to fetch conversation');
  }

  /**
   * Create a new conversation
   *
   * @param tenantId - Tenant ID
   * @param data - Conversation data
   * @returns Created conversation
   */
  async createConversation(
    tenantId: string,
    data: CreateConversationData
  ): Promise<ServiceResult<Conversation>> {
    return this.handleError(async () => {
      const { data: conversation, error } = await this.supabase
        .from('conversations')
        .insert({
          tenant_id: tenantId,
          client_id: data.client_id,
          pet_id: data.pet_id,
          subject: data.subject,
          channel: data.channel || 'in_app',
          priority: data.priority || 'normal',
          appointment_id: data.appointment_id,
          tags: data.tags,
          status: 'open',
        })
        .select(`
          *,
          client:profiles!client_id(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      // Send initial message if provided
      if (data.initial_message) {
        await this.sendMessage(conversation.id, tenantId, {
          sender_type: 'client',
          sender_id: data.client_id,
          content: data.initial_message,
        });
      }

      return conversation;
    }, 'Failed to create conversation');
  }

  /**
   * Update conversation status
   *
   * @param conversationId - Conversation ID
   * @param tenantId - Tenant ID
   * @param status - New status
   * @returns Updated conversation
   */
  async updateConversationStatus(
    conversationId: string,
    tenantId: string,
    status: ConversationStatus
  ): Promise<ServiceResult<Conversation>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('conversations')
        .update({ status })
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Conversation not found');
      return data;
    }, 'Failed to update conversation status');
  }

  /**
   * Assign conversation to staff member
   *
   * @param conversationId - Conversation ID
   * @param tenantId - Tenant ID
   * @param assignedTo - Staff member ID (null to unassign)
   * @returns Updated conversation
   */
  async assignConversation(
    conversationId: string,
    tenantId: string,
    assignedTo: string | null
  ): Promise<ServiceResult<Conversation>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('conversations')
        .update({
          assigned_to: assignedTo,
          assigned_at: assignedTo ? new Date().toISOString() : null,
        })
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Conversation not found');
      return data;
    }, 'Failed to assign conversation');
  }

  /**
   * Update conversation priority
   *
   * @param conversationId - Conversation ID
   * @param tenantId - Tenant ID
   * @param priority - New priority
   * @returns Updated conversation
   */
  async updateConversationPriority(
    conversationId: string,
    tenantId: string,
    priority: ConversationPriority
  ): Promise<ServiceResult<Conversation>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('conversations')
        .update({ priority })
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Conversation not found');
      return data;
    }, 'Failed to update conversation priority');
  }

  // ---------------------------------------------------------------------------
  // MESSAGES
  // ---------------------------------------------------------------------------

  /**
   * List messages in a conversation
   *
   * @param conversationId - Conversation ID
   * @param tenantId - Tenant ID for access control
   * @param filters - Optional filters
   * @param limit - Max messages to return (default 50)
   * @returns List of messages
   */
  async listMessages(
    conversationId: string,
    tenantId: string,
    filters?: MessageFilters,
    limit: number = 50
  ): Promise<ServiceResult<Message[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(id, full_name)
        `)
        .eq('conversation_id', conversationId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })
        .limit(limit);

      // Apply filters
      if (filters?.sender_type) {
        query = query.eq('sender_type', filters.sender_type);
      }

      if (filters?.message_type) {
        query = query.eq('message_type', filters.message_type);
      }

      if (filters?.from_date) {
        query = query.gte('created_at', filters.from_date);
      }

      if (filters?.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch messages');
  }

  /**
   * Send a message to a conversation
   *
   * @param conversationId - Conversation ID
   * @param tenantId - Tenant ID
   * @param data - Message data
   * @returns Created message
   */
  async sendMessage(
    conversationId: string,
    tenantId: string,
    data: SendMessageData
  ): Promise<ServiceResult<Message>> {
    return this.handleError(async () => {
      const { data: message, error } = await this.supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          tenant_id: tenantId,
          sender_id: data.sender_id,
          sender_type: data.sender_type,
          sender_name: data.sender_name,
          message_type: data.message_type || 'text',
          content: data.content,
          content_html: data.content_html,
          attachments: data.attachments || [],
          card_data: data.card_data,
          reply_to_id: data.reply_to_id,
          metadata: data.metadata || {},
          status: 'sent',
        })
        .select(`
          *,
          sender:profiles!sender_id(id, full_name)
        `)
        .single();

      if (error) throw error;
      return message;
    }, 'Failed to send message');
  }

  /**
   * Mark conversation as read
   *
   * @param conversationId - Conversation ID
   * @param tenantId - Tenant ID
   * @param userType - 'client' or 'staff'
   * @returns Success status
   */
  async markConversationRead(
    conversationId: string,
    tenantId: string,
    userType: 'client' | 'staff'
  ): Promise<ServiceResult<void>> {
    return this.handleError(async () => {
      const { error } = await this.supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
        p_user_type: userType,
      });

      if (error) throw error;
    }, 'Failed to mark conversation as read');
  }

  /**
   * Get unread message count for staff
   *
   * @param tenantId - Tenant ID
   * @returns Unread count
   */
  async getUnreadCount(tenantId: string): Promise<ServiceResult<number>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('conversations')
        .select('unread_staff_count')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .neq('status', 'closed')
        .neq('status', 'spam');

      if (error) throw error;

      const total = data?.reduce((sum, c) => sum + (c.unread_staff_count || 0), 0) || 0;
      return total;
    }, 'Failed to get unread count');
  }

  // ---------------------------------------------------------------------------
  // MESSAGE TEMPLATES
  // ---------------------------------------------------------------------------

  /**
   * List message templates
   *
   * @param tenantId - Tenant ID (also returns global templates)
   * @param filters - Optional filters
   * @returns List of templates
   */
  async listTemplates(
    tenantId: string,
    filters?: TemplateFilters
  ): Promise<ServiceResult<MessageTemplate[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('message_templates')
        .select('*')
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .is('deleted_at', null)
        .order('name');

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.channel) {
        query = query.contains('channels', [filters.channel]);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch templates');
  }

  /**
   * Get a template by code
   *
   * @param code - Template code
   * @param tenantId - Tenant ID
   * @returns Template record
   */
  async getTemplateByCode(
    code: string,
    tenantId: string
  ): Promise<ServiceResult<MessageTemplate | null>> {
    return this.handleError(async () => {
      // First try tenant-specific, then global
      const { data, error } = await this.supabase
        .from('message_templates')
        .select('*')
        .eq('code', code)
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .is('deleted_at', null)
        .order('tenant_id', { ascending: false, nullsFirst: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    }, 'Failed to fetch template');
  }

  /**
   * Create a message template
   *
   * @param tenantId - Tenant ID
   * @param data - Template data
   * @returns Created template
   */
  async createTemplate(
    tenantId: string,
    data: CreateTemplateData
  ): Promise<ServiceResult<MessageTemplate>> {
    return this.handleError(async () => {
      const { data: template, error } = await this.supabase
        .from('message_templates')
        .insert({
          tenant_id: tenantId,
          code: data.code,
          name: data.name,
          category: data.category,
          subject: data.subject,
          content: data.content,
          content_html: data.content_html,
          variables: data.variables,
          channels: data.channels || ['in_app'],
          language: data.language || 'es',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return template;
    }, 'Failed to create template');
  }

  /**
   * Update a message template
   *
   * @param templateId - Template ID
   * @param tenantId - Tenant ID
   * @param updates - Fields to update
   * @returns Updated template
   */
  async updateTemplate(
    templateId: string,
    tenantId: string,
    updates: Partial<CreateTemplateData> & { is_active?: boolean }
  ): Promise<ServiceResult<MessageTemplate>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('message_templates')
        .update(updates)
        .eq('id', templateId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Template not found');
      return data;
    }, 'Failed to update template');
  }

  /**
   * Delete a message template (soft delete)
   *
   * @param templateId - Template ID
   * @param tenantId - Tenant ID
   * @param deletedBy - User ID who deleted
   * @returns Success status
   */
  async deleteTemplate(
    templateId: string,
    tenantId: string,
    deletedBy: string
  ): Promise<ServiceResult<void>> {
    return this.handleError(async () => {
      const { error } = await this.supabase
        .from('message_templates')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy,
        })
        .eq('id', templateId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    }, 'Failed to delete template');
  }

  /**
   * Render a template with variables
   *
   * @param template - Template to render
   * @param variables - Variable values
   * @returns Rendered content
   */
  renderTemplate(
    template: MessageTemplate,
    variables: Record<string, string>
  ): { subject: string | null; content: string } {
    let content = template.content;
    let subject = template.subject || null;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), value);
      if (subject) {
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
      }
    }

    return { subject, content };
  }

  // ---------------------------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------------------------

  /**
   * Get messaging statistics for a tenant
   *
   * @param tenantId - Tenant ID
   * @returns Messaging stats
   */
  async getStats(tenantId: string): Promise<ServiceResult<{
    total_conversations: number;
    open_conversations: number;
    unread_count: number;
    avg_response_time_hours: number | null;
    messages_today: number;
  }>> {
    return this.handleError(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get conversation counts
      const { data: conversations, error: convError } = await this.supabase
        .from('conversations')
        .select('status, unread_staff_count, created_at, last_staff_message_at, last_client_message_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (convError) throw convError;

      // Get today's message count
      const { count: messagesCount, error: msgError } = await this.supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', today.toISOString());

      if (msgError) throw msgError;

      // Calculate stats
      const total = conversations?.length || 0;
      const open = conversations?.filter(c => c.status === 'open' || c.status === 'pending').length || 0;
      const unread = conversations?.reduce((sum, c) => sum + (c.unread_staff_count || 0), 0) || 0;

      // Calculate avg response time (hours between client message and staff response)
      const responseTimes = conversations
        ?.filter(c => c.last_client_message_at && c.last_staff_message_at)
        .map(c => {
          // Non-null assertion safe: filter ensures both timestamps exist
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const clientTime = new Date(c.last_client_message_at!).getTime();
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const staffTime = new Date(c.last_staff_message_at!).getTime();
          if (staffTime > clientTime) {
            return (staffTime - clientTime) / (1000 * 60 * 60); // hours
          }
          return null;
        })
        .filter((t): t is number => t !== null) || [];

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : null;

      return {
        total_conversations: total,
        open_conversations: open,
        unread_count: unread,
        avg_response_time_hours: avgResponseTime ? Math.round(avgResponseTime * 10) / 10 : null,
        messages_today: messagesCount || 0,
      };
    }, 'Failed to fetch messaging statistics');
  }
}
