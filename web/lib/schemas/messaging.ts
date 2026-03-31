/**
 * Messaging validation schemas
 * For conversations, messages, WhatsApp, and templates
 */

import { z } from 'zod'
import { uuidSchema, requiredString, optionalString, enumSchema } from './common'

// =============================================================================
// CONVERSATION CHANNELS
// =============================================================================

export const CONVERSATION_CHANNELS = ['internal', 'whatsapp', 'email', 'sms'] as const
export type ConversationChannel = (typeof CONVERSATION_CHANNELS)[number]

/**
 * Conversation statuses
 */
export const CONVERSATION_STATUSES = ['open', 'pending', 'resolved', 'closed', 'spam'] as const
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number]

/**
 * Conversation priorities
 */
export const CONVERSATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export type ConversationPriority = (typeof CONVERSATION_PRIORITIES)[number]

// =============================================================================
// CONVERSATIONS
// =============================================================================

/**
 * Schema for creating a conversation
 */
export const createConversationSchema = z.object({
  client_id: uuidSchema,
  pet_id: uuidSchema.optional(),
  channel: enumSchema(CONVERSATION_CHANNELS, 'Canal'),
  subject: optionalString(200),
  priority: enumSchema(CONVERSATION_PRIORITIES, 'Prioridad').default('normal'),
  assigned_to: uuidSchema.optional(), // Staff member
})

export type CreateConversationInput = z.infer<typeof createConversationSchema>

/**
 * Schema for updating a conversation
 */
export const updateConversationSchema = z.object({
  status: z.enum(CONVERSATION_STATUSES).optional(),
  priority: z.enum(CONVERSATION_PRIORITIES).optional(),
  assigned_to: uuidSchema.optional(),
  subject: optionalString(200),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

export type UpdateConversationInput = z.infer<typeof updateConversationSchema>

// =============================================================================
// MESSAGES
// =============================================================================

/**
 * Message types
 */
export const MESSAGE_TYPES = [
  'text',
  'image',
  'file',
  'audio',
  'video',
  'location',
  'appointment_card',
  'invoice_card',
  'prescription_card',
  'system',
] as const
export type MessageType = (typeof MESSAGE_TYPES)[number]

/**
 * Sender types
 */
export const SENDER_TYPES = ['staff', 'client', 'system'] as const
export type SenderType = (typeof SENDER_TYPES)[number]

/**
 * Schema for message attachments
 */
const ATTACHMENT_TYPES = ['image', 'document', 'audio', 'video'] as const

export const messageAttachmentSchema = z.object({
  url: z.string().url('URL inválida'),
  type: z.enum(ATTACHMENT_TYPES),
  name: requiredString('Nombre de archivo', 255),
  size_bytes: z.number().int().min(1).max(20971520), // 20MB max
  mime_type: optionalString(100),
})

export type MessageAttachment = z.infer<typeof messageAttachmentSchema>

/**
 * Schema for sending a message
 */
export const sendMessageSchema = z.object({
  conversation_id: uuidSchema,
  content: requiredString('Mensaje', 5000),
  message_type: enumSchema(MESSAGE_TYPES, 'Tipo de mensaje').default('text'),
  attachments: z.array(messageAttachmentSchema).max(10).optional(),
  reply_to_message_id: uuidSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(), // For card data, etc.
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>

/**
 * Schema for quick replies (predefined responses)
 */
export const quickReplySchema = z.object({
  text: requiredString('Texto', 1000),
  attachments: z.array(messageAttachmentSchema).max(5).optional(),
})

export type QuickReplyInput = z.infer<typeof quickReplySchema>

// =============================================================================
// WHATSAPP MESSAGES
// =============================================================================

/**
 * WhatsApp message directions
 */
export const WHATSAPP_DIRECTIONS = ['inbound', 'outbound'] as const
export type WhatsappDirection = (typeof WHATSAPP_DIRECTIONS)[number]

/**
 * Schema for sending WhatsApp message
 */
export const sendWhatsappMessageSchema = z.object({
  phone_number: z.string().regex(/^\+?[1-9]\d{6,14}$/, 'Número de teléfono inválido'),
  content: requiredString('Mensaje', 4096), // WhatsApp limit
  template_id: uuidSchema.optional(),
  template_variables: z.record(z.string(), z.string()).optional(),
  attachments: z.array(messageAttachmentSchema).max(1).optional(), // WhatsApp allows 1 media per message
})

export type SendWhatsappMessageInput = z.infer<typeof sendWhatsappMessageSchema>

/**
 * Schema for WhatsApp webhook payload validation
 */
const WHATSAPP_MESSAGE_TYPES = ['text', 'image', 'audio', 'video', 'document', 'location'] as const

export const whatsappWebhookSchema = z.object({
  message_id: z.string(),
  from: z.string().regex(/^\+?[1-9]\d{6,14}$/),
  timestamp: z.string().datetime(),
  type: z.enum(WHATSAPP_MESSAGE_TYPES),
  content: z.string().max(4096),
  media_url: z.string().url().optional(),
  caption: z.string().max(1024).optional(),
})

export type WhatsappWebhookPayload = z.infer<typeof whatsappWebhookSchema>

// =============================================================================
// MESSAGE TEMPLATES
// =============================================================================

/**
 * Template categories
 */
export const TEMPLATE_CATEGORIES = [
  'appointment_confirmation',
  'appointment_reminder',
  'appointment_cancellation',
  'invoice_sent',
  'payment_received',
  'lab_results_ready',
  'prescription_ready',
  'vaccine_reminder',
  'follow_up',
  'birthday',
  'general',
  'emergency',
] as const
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]

/**
 * Schema for creating a message template
 */
export const createTemplateSchema = z.object({
  name: requiredString('Nombre', 200),
  category: enumSchema(TEMPLATE_CATEGORIES, 'Categoría'),
  channel: enumSchema(CONVERSATION_CHANNELS, 'Canal'),
  subject: optionalString(200), // For email templates
  body: requiredString('Cuerpo', 5000),
  variables: z.array(z.string().max(50)).max(20).optional(), // e.g., ["pet_name", "owner_name"]
  is_active: z.boolean().default(true),
})

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>

/**
 * Schema for updating a template
 */
export const updateTemplateSchema = createTemplateSchema.partial().extend({
  id: uuidSchema,
})

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>

/**
 * Schema for rendering a template with variables
 */
export const renderTemplateSchema = z.object({
  template_id: uuidSchema,
  variables: z.record(z.string(), z.string()),
})

export type RenderTemplateInput = z.infer<typeof renderTemplateSchema>

// =============================================================================
// NOTIFICATIONS
// =============================================================================

/**
 * Notification channels
 */
export const NOTIFICATION_CHANNELS = ['in_app', 'sms', 'whatsapp', 'email', 'push'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

/**
 * Schema for sending a notification
 */
const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high'] as const

export const sendNotificationSchema = z.object({
  user_id: uuidSchema,
  title: requiredString('Título', 200),
  message: requiredString('Mensaje', 1000),
  channels: z.array(z.enum(NOTIFICATION_CHANNELS)).min(1, 'Selecciona al menos un canal'),
  action_url: z.string().url().optional(),
  priority: z.enum(NOTIFICATION_PRIORITIES).default('normal'),
  schedule_at: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>

// =============================================================================
// BULK MESSAGING
// =============================================================================

/**
 * Schema for bulk message sending
 */
export const sendBulkMessagesSchema = z.object({
  recipients: z
    .array(
      z.object({
        client_id: uuidSchema,
        phone_number: z
          .string()
          .regex(/^\+?[1-9]\d{6,14}$/)
          .optional(),
        email: z.string().email().optional(),
      })
    )
    .min(1, 'Selecciona al menos un destinatario')
    .max(100, 'Máximo 100 destinatarios por envío'),
  channel: enumSchema(CONVERSATION_CHANNELS, 'Canal'),
  template_id: uuidSchema.optional(),
  content: requiredString('Mensaje', 5000),
  subject: optionalString(200), // For email
  schedule_at: z.string().datetime().optional(),
})

export type SendBulkMessagesInput = z.infer<typeof sendBulkMessagesSchema>

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

/**
 * Schema for conversation query parameters
 */
export const conversationQuerySchema = z.object({
  status: z.enum(CONVERSATION_STATUSES).optional(),
  channel: z.enum(CONVERSATION_CHANNELS).optional(),
  priority: z.enum(CONVERSATION_PRIORITIES).optional(),
  assigned_to: uuidSchema.optional(),
  client_id: uuidSchema.optional(),
  pet_id: uuidSchema.optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  search: z.string().min(2).max(100).optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ConversationQueryParams = z.infer<typeof conversationQuerySchema>

/**
 * Schema for message query parameters
 */
export const messageQuerySchema = z.object({
  conversation_id: uuidSchema,
  before_message_id: uuidSchema.optional(),
  after_message_id: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type MessageQueryParams = z.infer<typeof messageQuerySchema>
