/**
 * Messaging Domain Types
 *
 * Types for conversations, messages, and templates.
 */

// ===========================================================================
// ENUMS & CONSTANTS
// ===========================================================================

export type MessageChannel = 'in_app' | 'sms' | 'whatsapp' | 'email'
export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed' | 'spam'
export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent'
export type SenderType = 'client' | 'staff' | 'system' | 'bot'
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

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
  | 'system'

export type TemplateCategory =
  | 'appointment'
  | 'reminder'
  | 'follow_up'
  | 'marketing'
  | 'transactional'
  | 'welcome'
  | 'feedback'
  | 'custom'

// ===========================================================================
// CORE ENTITIES
// ===========================================================================

export interface Conversation {
  id: string
  tenant_id: string
  client_id: string
  pet_id?: string | null
  subject?: string | null
  channel: MessageChannel
  status: ConversationStatus
  priority: ConversationPriority
  assigned_to?: string | null
  assigned_at?: string | null
  last_message_at?: string | null
  last_client_message_at?: string | null
  last_staff_message_at?: string | null
  client_last_read_at?: string | null
  staff_last_read_at?: string | null
  unread_client_count: number
  unread_staff_count: number
  appointment_id?: string | null
  tags?: string[] | null
  created_at: string
  updated_at: string
  // Joined data
  client?: { id: string; full_name: string; email: string; phone?: string } | null
  pet?: { id: string; name: string; species?: string; breed?: string } | null
  assigned?: { id: string; full_name: string } | null
}

export interface MessageAttachment {
  url: string
  type: string
  name?: string
  size?: number
}

export interface Message {
  id: string
  conversation_id: string
  tenant_id: string
  sender_id?: string | null
  sender_type: SenderType
  sender_name?: string | null
  message_type: MessageType
  content?: string | null
  content_html?: string | null
  attachments?: MessageAttachment[] | null
  card_data?: Record<string, unknown> | null
  reply_to_id?: string | null
  status: MessageStatus
  delivered_at?: string | null
  read_at?: string | null
  failed_reason?: string | null
  external_message_id?: string | null
  external_channel?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Joined data
  sender?: { id: string; full_name: string } | null
  reply_to?: Message | null
}

export interface MessageTemplate {
  id: string
  tenant_id?: string | null
  code: string
  name: string
  category: TemplateCategory
  subject?: string | null
  content: string
  content_html?: string | null
  variables?: string[] | null
  channels?: MessageChannel[] | null
  sms_approved: boolean
  whatsapp_template_id?: string | null
  language: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ===========================================================================
// INPUT TYPES
// ===========================================================================

export interface CreateConversationInput {
  client_id: string
  pet_id?: string
  subject?: string
  channel?: MessageChannel
  priority?: ConversationPriority
  appointment_id?: string
  tags?: string[]
  initial_message?: string
}

export interface SendMessageInput {
  sender_id?: string
  sender_type: SenderType
  sender_name?: string
  message_type?: MessageType
  content: string
  content_html?: string
  attachments?: MessageAttachment[]
  card_data?: Record<string, unknown>
  reply_to_id?: string
  metadata?: Record<string, unknown>
}

export interface CreateTemplateInput {
  code: string
  name: string
  category: TemplateCategory
  subject?: string
  content: string
  content_html?: string
  variables?: string[]
  channels?: MessageChannel[]
  language?: string
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  is_active?: boolean
}

// ===========================================================================
// FILTER TYPES
// ===========================================================================

export interface ConversationFilters {
  status?: ConversationStatus
  priority?: ConversationPriority
  channel?: MessageChannel
  client_id?: string
  pet_id?: string
  assigned_to?: string
  unassigned?: boolean
  has_unread?: boolean
  search?: string
}

export interface MessageFilters {
  sender_type?: SenderType
  message_type?: MessageType
  from_date?: string
  to_date?: string
}

export interface TemplateFilters {
  category?: TemplateCategory
  channel?: MessageChannel
  is_active?: boolean
  search?: string
}

// ===========================================================================
// STATISTICS
// ===========================================================================

export interface MessagingStats {
  total_conversations: number
  open_conversations: number
  unread_count: number
  avg_response_time_hours: number | null
  messages_today: number
}
