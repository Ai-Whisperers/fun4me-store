/**
 * Shared types for the bulk messaging feature
 */

export interface Client {
  id: string
  full_name: string
  email: string
  phone: string
  tags?: string[]
  pets_count?: number
}

export type MessageChannel = 'whatsapp' | 'email' | 'sms'

export type BulkMessagingStep = 'select' | 'compose' | 'review' | 'sending'

export interface MessageTemplate {
  id: string
  title: string
  message: string
}

export interface FilterOption {
  id: string
  label: string
  icon: React.ElementType
  color: string
}

export interface SendResult {
  success: number
  failed: number
}

export interface BulkMessagingState {
  step: BulkMessagingStep
  selectedFilter: string
  clients: Client[]
  selectedClients: Set<string>
  isLoading: boolean
  channel: MessageChannel
  message: string
  selectedTemplate: string | null
  searchQuery: string
  sendProgress: number
  sendResult: SendResult | null
}
