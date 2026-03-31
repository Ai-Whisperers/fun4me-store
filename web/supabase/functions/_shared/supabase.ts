import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

export interface NotificationQueueItem {
  id: string
  tenant_id: string
  channel: 'email' | 'sms' | 'push' | 'whatsapp'
  recipient_id: string | null
  recipient_address: string
  template_id: string | null
  subject: string | null
  body: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  scheduled_for: string | null
  metadata: Record<string, unknown>
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
  retry_count: number
  created_at: string
}

export interface TenantConfig {
  id: string
  name: string
  email_provider?: 'resend' | 'sendgrid' | 'smtp'
  email_from?: string
  email_api_key?: string
  sms_provider?: 'twilio' | 'vonage'
  sms_from?: string
  sms_api_key?: string
  sms_api_secret?: string
}
