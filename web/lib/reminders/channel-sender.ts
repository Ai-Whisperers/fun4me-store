/**
 * Reminder Channel Sender
 *
 * Sends reminder notifications through various channels (email, WhatsApp).
 * SMS is not supported - use WhatsApp for phone-based messaging.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/client'
import { sendWhatsAppMessage, isWhatsAppConfigured } from '@/lib/whatsapp/client'
import { logger } from '@/lib/logger'
import type { Reminder, ClientInfo, ChannelResult, ReminderContent } from './types'

interface CommunicationPreferences {
  allow_email: boolean
  allow_sms: boolean
  allow_whatsapp: boolean
}

/**
 * Send reminder to a specific channel
 */
async function sendToChannel(
  supabase: SupabaseClient,
  channel: string,
  reminder: Reminder,
  client: ClientInfo,
  content: ReminderContent,
  prefs: CommunicationPreferences | null
): Promise<ChannelResult> {
  const now = new Date()

  switch (channel) {
    case 'email': {
      // Check if email is allowed and client has email
      if (prefs?.allow_email === false) {
        return { channel: 'email', success: false, error: 'User opted out' }
      }
      if (!client?.email) {
        return { channel: 'email', success: false, error: 'No email address' }
      }

      const emailResult = await sendEmail({
        to: client.email,
        subject: content.subject,
        html: content.htmlBody,
        text: content.textBody,
      })

      if (emailResult.success) {
        await supabase.from('notification_queue').insert({
          tenant_id: reminder.tenant_id,
          reminder_id: reminder.id,
          client_id: reminder.client_id,
          channel_type: 'email',
          destination: client.email,
          subject: content.subject,
          body: content.textBody,
          status: 'sent',
          sent_at: now.toISOString(),
        })
        return { channel: 'email', success: true }
      } else {
        return { channel: 'email', success: false, error: emailResult.error }
      }
    }

    case 'whatsapp': {
      // Check if WhatsApp is allowed and configured
      if (prefs?.allow_whatsapp === false) {
        return { channel: 'whatsapp', success: false, error: 'User opted out' }
      }
      if (!isWhatsAppConfigured()) {
        return { channel: 'whatsapp', success: false, error: 'WhatsApp not configured' }
      }
      if (!client?.phone) {
        return { channel: 'whatsapp', success: false, error: 'No phone number' }
      }

      const waResult = await sendWhatsAppMessage({
        to: client.phone,
        body: content.textBody,
      })

      if (waResult.success) {
        await supabase.from('notification_queue').insert({
          tenant_id: reminder.tenant_id,
          reminder_id: reminder.id,
          client_id: reminder.client_id,
          channel_type: 'whatsapp',
          destination: client.phone,
          subject: null,
          body: content.textBody,
          status: 'sent',
          sent_at: now.toISOString(),
          external_id: waResult.sid,
        })
        return { channel: 'whatsapp', success: true }
      } else {
        return { channel: 'whatsapp', success: false, error: waResult.error }
      }
    }

    case 'sms': {
      // SMS not supported - recommend using WhatsApp instead
      logger.info('SMS channel requested but not supported, use WhatsApp instead', {
        tenantId: reminder.tenant_id,
        reminderId: reminder.id,
      })
      return {
        channel: 'sms',
        success: false,
        error: 'SMS no soportado. Use WhatsApp para mensajes por teléfono.',
      }
    }

    default:
      return { channel, success: false, error: 'Unknown channel' }
  }
}

/**
 * Send reminder to all configured channels
 */
export async function sendReminderToChannels(
  supabase: SupabaseClient,
  reminder: Reminder,
  client: ClientInfo,
  content: ReminderContent
): Promise<ChannelResult[]> {
  // Determine channels to send (default to email if not specified)
  const channels = reminder.channels || ['email']
  const alreadySent = reminder.channels_sent || []
  const channelsToSend = channels.filter((ch) => !alreadySent.includes(ch))

  // Get user's communication preferences
  const { data: prefs } = await supabase
    .from('communication_preferences')
    .select('allow_email, allow_sms, allow_whatsapp')
    .eq('user_id', reminder.client_id)
    .single()

  const results: ChannelResult[] = []

  // Send to each channel
  for (const channel of channelsToSend) {
    try {
      const result = await sendToChannel(supabase, channel, reminder, client, content, prefs)
      results.push(result)
    } catch (channelError: unknown) {
      results.push({
        channel,
        success: false,
        error: channelError instanceof Error ? channelError.message : 'Unknown error',
      })
    }
  }

  return results
}
