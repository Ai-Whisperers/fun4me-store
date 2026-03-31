/**
 * Messaging Service
 *
 * Business logic for conversations, messages, and templates.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { MessagingRepository } from './repository'
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
  MessagingStats,
} from './types'
import { logger } from '@/lib/logger'

export class MessagingService {
  private repository: MessagingRepository

  constructor(private supabase: SupabaseClient) {
    this.repository = new MessagingRepository(supabase)
  }

  // ===========================================================================
  // CONVERSATIONS
  // ===========================================================================

  async listConversations(
    tenantId: string,
    filters?: ConversationFilters
  ): Promise<Conversation[]> {
    return this.repository.findConversations(tenantId, filters)
  }

  async getConversation(
    conversationId: string,
    tenantId: string
  ): Promise<Conversation | null> {
    return this.repository.findConversationById(conversationId, tenantId)
  }

  async createConversation(
    tenantId: string,
    input: CreateConversationInput
  ): Promise<Conversation> {
    const conversation = await this.repository.createConversation(tenantId, input)

    // Send initial message if provided
    if (input.initial_message) {
      await this.sendMessage(conversation.id, tenantId, {
        sender_type: 'client',
        sender_id: input.client_id,
        content: input.initial_message,
      })
    }

    logger.info('[MessagingService] Conversation created', {
      conversationId: conversation.id,
      clientId: input.client_id,
    })

    return conversation
  }

  async updateConversationStatus(
    conversationId: string,
    tenantId: string,
    status: ConversationStatus
  ): Promise<Conversation> {
    const conversation = await this.repository.updateConversationStatus(
      conversationId,
      tenantId,
      status
    )

    logger.info('[MessagingService] Conversation status updated', {
      conversationId,
      status,
    })

    return conversation
  }

  async assignConversation(
    conversationId: string,
    tenantId: string,
    assignedTo: string | null
  ): Promise<Conversation> {
    const conversation = await this.repository.updateConversationAssignment(
      conversationId,
      tenantId,
      assignedTo
    )

    logger.info('[MessagingService] Conversation assigned', {
      conversationId,
      assignedTo,
    })

    return conversation
  }

  async updateConversationPriority(
    conversationId: string,
    tenantId: string,
    priority: ConversationPriority
  ): Promise<Conversation> {
    return this.repository.updateConversationPriority(conversationId, tenantId, priority)
  }

  // ===========================================================================
  // MESSAGES
  // ===========================================================================

  async listMessages(
    conversationId: string,
    tenantId: string,
    filters?: MessageFilters,
    limit: number = 50
  ): Promise<Message[]> {
    return this.repository.findMessages(conversationId, tenantId, filters, limit)
  }

  async sendMessage(
    conversationId: string,
    tenantId: string,
    input: SendMessageInput
  ): Promise<Message> {
    const message = await this.repository.createMessage(conversationId, tenantId, input)

    logger.info('[MessagingService] Message sent', {
      conversationId,
      messageId: message.id,
      senderType: input.sender_type,
    })

    return message
  }

  async markConversationRead(
    conversationId: string,
    tenantId: string,
    userType: 'client' | 'staff'
  ): Promise<void> {
    await this.repository.markConversationRead(conversationId, userType)
  }

  async getUnreadCount(tenantId: string): Promise<number> {
    return this.repository.getUnreadCount(tenantId)
  }

  // ===========================================================================
  // TEMPLATES
  // ===========================================================================

  async listTemplates(tenantId: string, filters?: TemplateFilters): Promise<MessageTemplate[]> {
    return this.repository.findTemplates(tenantId, filters)
  }

  async getTemplateByCode(code: string, tenantId: string): Promise<MessageTemplate | null> {
    return this.repository.findTemplateByCode(code, tenantId)
  }

  async createTemplate(tenantId: string, input: CreateTemplateInput): Promise<MessageTemplate> {
    const template = await this.repository.createTemplate(tenantId, input)

    logger.info('[MessagingService] Template created', {
      templateId: template.id,
      code: input.code,
    })

    return template
  }

  async updateTemplate(
    templateId: string,
    tenantId: string,
    updates: UpdateTemplateInput
  ): Promise<MessageTemplate> {
    return this.repository.updateTemplate(templateId, tenantId, updates)
  }

  async deleteTemplate(templateId: string, tenantId: string, deletedBy: string): Promise<void> {
    await this.repository.softDeleteTemplate(templateId, tenantId, deletedBy)

    logger.info('[MessagingService] Template deleted', { templateId, deletedBy })
  }

  /**
   * Render a template with variable substitution
   */
  renderTemplate(
    template: MessageTemplate,
    variables: Record<string, string>
  ): { subject: string | null; content: string } {
    let content = template.content
    let subject = template.subject || null

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`
      content = content.replace(new RegExp(placeholder, 'g'), value)
      if (subject) {
        subject = subject.replace(new RegExp(placeholder, 'g'), value)
      }
    }

    return { subject, content }
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  async getStats(tenantId: string): Promise<MessagingStats> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const conversations = await this.repository.getConversationsForStats(tenantId)
    const messagesCount = await this.repository.getMessageCountForDate(
      tenantId,
      today.toISOString()
    )

    const total = conversations.length
    const open = conversations.filter(
      (c) => c.status === 'open' || c.status === 'pending'
    ).length
    const unread = conversations.reduce((sum, c) => sum + (c.unread_staff_count || 0), 0)

    // Calculate avg response time
    const responseTimes = conversations
      .filter((c) => c.last_client_message_at && c.last_staff_message_at)
      .map((c) => {
        // Non-null assertion safe: filter ensures both timestamps exist
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const clientTime = new Date(c.last_client_message_at!).getTime()
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const staffTime = new Date(c.last_staff_message_at!).getTime()
        if (staffTime > clientTime) {
          return (staffTime - clientTime) / (1000 * 60 * 60)
        }
        return null
      })
      .filter((t): t is number => t !== null)

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : null

    return {
      total_conversations: total,
      open_conversations: open,
      unread_count: unread,
      avg_response_time_hours: avgResponseTime ? Math.round(avgResponseTime * 10) / 10 : null,
      messages_today: messagesCount,
    }
  }
}
