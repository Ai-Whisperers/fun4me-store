/**
 * Reminder Types
 */

export interface Reminder {
  id: string
  tenant_id: string
  client_id: string
  pet_id: string | null
  type: string
  reference_type: string | null
  reference_id: string | null
  scheduled_at: string
  status: string
  attempts: number
  max_attempts: number
  channels: string[] | null
  channels_sent: string[] | null
  custom_subject: string | null
  custom_body: string | null
  client:
    | ClientInfo
    | ClientInfo[]
  pet:
    | PetInfo
    | PetInfo[]
    | null
}

export interface ClientInfo {
  id: string
  full_name: string
  email: string
  phone: string | null
}

export interface PetInfo {
  id: string
  name: string
  species: string
}

export interface MessageTemplate {
  id: string
  code: string
  name: string
  subject: string | null
  content: string
  content_html: string | null
  variables: string[]
}

export interface ChannelResult {
  channel: string
  success: boolean
  error?: string
}

export interface ReminderContent {
  subject: string
  htmlBody: string
  textBody: string
}
