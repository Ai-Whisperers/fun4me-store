import twilio from 'twilio'
import { formatParaguayPhone } from '@/lib/types/whatsapp'
import { logger } from '@/lib/logger'

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886' // Sandbox default

// Create Twilio client
const client = accountSid && authToken ? twilio(accountSid, authToken) : null

export interface SendWhatsAppParams {
  to: string // Phone number without whatsapp: prefix
  body: string
  mediaUrl?: string
}

export interface SendWhatsAppResult {
  success: boolean
  sid?: string
  status?: string
  error?: string
}

/**
 * Send a WhatsApp message via Twilio
 */
export async function sendWhatsAppMessage({
  to,
  body,
  mediaUrl,
}: SendWhatsAppParams): Promise<SendWhatsAppResult> {
  if (!client) {
    logger.error('[WhatsApp] Twilio client not configured', {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
    })
    return {
      success: false,
      error: 'Twilio no está configurado',
    }
  }

  // Format numbers for WhatsApp
  const fromNumber = `whatsapp:${whatsappNumber}`
  const toNumber = `whatsapp:${formatParaguayPhone(to)}`

  try {
    const message = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body,
      mediaUrl: mediaUrl ? [mediaUrl] : undefined,
    })

    return {
      success: true,
      sid: message.sid,
      status: message.status,
    }
  } catch (error: unknown) {
    // TICKET-TYPE-004: Proper error handling without any
    logger.error('[WhatsApp] Send error', {
      error: error instanceof Error ? error.message : String(error),
      to: toNumber,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al enviar mensaje',
    }
  }
}

/**
 * Get message status from Twilio
 */
export async function getMessageStatus(messageSid: string): Promise<string | null> {
  if (!client) {
    return null
  }

  try {
    const message = await client.messages(messageSid).fetch()
    return message.status
  } catch (error: unknown) {
    logger.error('[WhatsApp] Error fetching message status', {
      error: error instanceof Error ? error.message : String(error),
      messageSid,
    })
    return null
  }
}

/**
 * Check if WhatsApp is configured
 */
export function isWhatsAppConfigured(): boolean {
  return !!(accountSid && authToken && whatsappNumber)
}

export { formatParaguayPhone }
