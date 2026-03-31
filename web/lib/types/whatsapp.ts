// WhatsApp Message Types
export type MessageDirection = 'inbound' | 'outbound'
/**
 * WhatsApp-specific message status (uses 'queued' instead of generic 'pending')
 * Note: For generic message status, use MessageStatus from '@/lib/types/status'
 */
export type WhatsAppMessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
export type ConversationType = 'appointment_reminder' | 'vaccine_reminder' | 'general' | 'support'
export type TemplateCategory = ConversationType

export interface WhatsAppMessage {
  id: string
  tenant_id: string
  client_id?: string | null
  phone_number: string
  direction: MessageDirection
  content: string
  media_url?: string | null
  status: WhatsAppMessageStatus
  twilio_sid?: string | null
  conversation_type?: ConversationType | null
  related_id?: string | null
  error_message?: string | null
  sent_at?: string | null
  delivered_at?: string | null
  read_at?: string | null
  created_at: string
  // Joined data
  client?: {
    id: string
    full_name: string
    phone?: string
  }
}

export interface WhatsAppTemplate {
  id: string
  tenant_id: string
  name: string
  content: string
  variables: string[]
  category?: ConversationType | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WhatsAppConversation {
  phone_number: string
  client_id?: string | null
  client_name?: string
  last_message: string
  last_message_at: string
  direction: MessageDirection
  unread_count: number
  messages?: WhatsAppMessage[]
}

// Extended conversation interface for UI display
export interface Conversation extends WhatsAppConversation {
  last_message_direction?: MessageDirection
  last_message_status?: WhatsAppMessageStatus
}

// Twilio webhook payload
export interface TwilioWhatsAppWebhook {
  MessageSid: string
  AccountSid: string
  From: string
  To: string
  Body: string
  NumMedia: string
  MediaUrl0?: string
  MediaContentType0?: string
}

// Status Configuration
export const whatsAppStatusConfig: Record<
  WhatsAppMessageStatus,
  { label: string; icon: string; className: string }
> = {
  queued: { label: 'En cola', icon: 'clock', className: 'text-gray-400' },
  sent: { label: 'Enviado', icon: 'check', className: 'text-gray-500' },
  delivered: { label: 'Entregado', icon: 'check-check', className: 'text-blue-500' },
  read: { label: 'Leído', icon: 'check-check', className: 'text-green-500' },
  failed: { label: 'Error', icon: 'x', className: 'text-red-500' },
}

// Template Category Configuration
export const templateCategoryConfig: Record<
  TemplateCategory,
  { label: string; icon: string; color: string }
> = {
  appointment_reminder: { label: 'Recordatorio de cita', icon: 'calendar', color: 'blue' },
  vaccine_reminder: { label: 'Recordatorio de vacuna', icon: 'syringe', color: 'green' },
  general: { label: 'General', icon: 'message-circle', color: 'gray' },
  support: { label: 'Soporte', icon: 'help-circle', color: 'purple' },
}

// Conversation Type Labels
export const conversationTypeLabels: Record<ConversationType, string> = {
  appointment_reminder: 'Recordatorio de cita',
  vaccine_reminder: 'Recordatorio de vacuna',
  general: 'General',
  support: 'Soporte',
}

// WhatsApp brand color
export const WHATSAPP_GREEN = '#25D366'

// Utility Functions

/**
 * Format Paraguay phone number to international format
 */
export function formatParaguayPhone(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '')

  // Add Paraguay country code if not present
  if (!cleaned.startsWith('595')) {
    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1)
    }
    cleaned = '595' + cleaned
  }

  return '+' + cleaned
}

/**
 * Format phone for display
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.startsWith('595')) {
    const local = cleaned.substring(3)
    if (local.length === 9) {
      return `0${local.substring(0, 3)} ${local.substring(3, 6)} ${local.substring(6)}`
    }
  }

  return phone
}

/**
 * Replace template variables with values
 */
export function fillTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return result
}

/**
 * Extract variables from template content
 */
export function extractTemplateVariables(content: string): string[] {
  const matches = content.match(/{{(\w+)}}/g) || []
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, '')))]
}

/**
 * Format time for message display
 */
export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return 'Ayer'
  } else if (diffDays < 7) {
    return date.toLocaleDateString('es-PY', { weekday: 'short' })
  } else {
    return date.toLocaleDateString('es-PY', { day: '2-digit', month: 'short' })
  }
}

// Default Templates
export const defaultWhatsAppTemplates = [
  {
    name: 'Recordatorio de cita',
    content:
      'Hola {{client_name}}! 🐾 Te recordamos que {{pet_name}} tiene cita el {{date}} a las {{time}}. ¿Confirmas asistencia?',
    variables: ['client_name', 'pet_name', 'date', 'time'],
    category: 'appointment_reminder' as ConversationType,
  },
  {
    name: 'Vacuna próxima',
    content:
      'Hola {{client_name}}! 💉 La vacuna de {{pet_name}} ({{vaccine_name}}) vence el {{due_date}}. Agenda tu cita llamando al {{clinic_phone}}.',
    variables: ['client_name', 'pet_name', 'vaccine_name', 'due_date', 'clinic_phone'],
    category: 'vaccine_reminder' as ConversationType,
  },
  {
    name: 'Confirmación de cita',
    content:
      '✅ Cita confirmada para {{pet_name}} el {{date}} a las {{time}}. Te esperamos en {{clinic_name}}!',
    variables: ['pet_name', 'date', 'time', 'clinic_name'],
    category: 'appointment_reminder' as ConversationType,
  },
  {
    name: 'Mensaje de bienvenida',
    content:
      '¡Hola {{client_name}}! 👋 Bienvenido a {{clinic_name}}. Estamos aquí para cuidar de {{pet_name}}. ¿En qué podemos ayudarte?',
    variables: ['client_name', 'clinic_name', 'pet_name'],
    category: 'general' as ConversationType,
  },
]
