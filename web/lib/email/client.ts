/**
 * Email Client
 *
 * Handles email delivery using Resend API
 * Falls back to logging (without sensitive content) if RESEND_API_KEY is not configured
 */

import { Resend } from 'resend'
import { logger } from '@/lib/logger'

// =============================================================================
// Types
// =============================================================================

export interface EmailAttachment {
  filename: string
  content: Buffer | string
  contentType?: string
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: EmailAttachment[]
}

export interface EmailResult {
  success: boolean
  error?: string
  messageId?: string
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Mask email address for logging (show only first 3 chars + domain)
 * Example: "john.doe@example.com" -> "joh***@example.com"
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***@***'
  const visibleChars = Math.min(3, local.length)
  return `${local.slice(0, visibleChars)}***@${domain}`
}

/**
 * Mask email addresses (single or array)
 */
function maskEmails(emails: string | string[]): string {
  if (Array.isArray(emails)) {
    return emails.map(maskEmail).join(', ')
  }
  return maskEmail(emails)
}

// =============================================================================
// Client Configuration
// =============================================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY
const DEFAULT_FROM = process.env.EMAIL_FROM || 'noreply@veterinaria.com'

let resendClient: Resend | null = null

// Initialize Resend client if API key is available
if (RESEND_API_KEY) {
  try {
    resendClient = new Resend(RESEND_API_KEY)
    logger.info('Email client initialized', { provider: 'resend' })
  } catch (error: unknown) {
    logger.error('Failed to initialize email client', { error })
  }
} else {
  logger.warn('Email service not configured', {
    reason: 'RESEND_API_KEY not set',
    mode: 'fallback',
  })
}

// =============================================================================
// Email Sending Functions
// =============================================================================

/**
 * Send an email using Resend or fallback to logging
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const { to, subject, html, text, from = DEFAULT_FROM, replyTo, cc, bcc, attachments } = options

  // Validate required fields
  if (!to || to.length === 0) {
    logger.warn('Email send failed: missing recipient')
    return {
      success: false,
      error: 'Recipient email address is required',
    }
  }

  if (!subject) {
    logger.warn('Email send failed: missing subject')
    return {
      success: false,
      error: 'Email subject is required',
    }
  }

  if (!html) {
    logger.warn('Email send failed: missing content')
    return {
      success: false,
      error: 'Email HTML content is required',
    }
  }

  // Prepare log context (masked for security)
  const logContext = {
    to: maskEmails(to),
    subject,
    hasText: !!text,
    hasCc: !!cc,
    hasBcc: !!bcc,
    hasReplyTo: !!replyTo,
    hasAttachments: !!attachments && attachments.length > 0,
    attachmentCount: attachments?.length ?? 0,
    contentLength: html.length,
  }

  // If Resend is configured, use it
  if (resendClient) {
    try {
      const result = await resendClient.emails.send({
        from,
        to,
        subject,
        html,
        text,
        replyTo,
        cc,
        bcc,
        attachments: attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          content_type: att.contentType,
        })),
      })

      if (result.error) {
        logger.error('Email send failed', {
          ...logContext,
          error: result.error.message || 'Unknown Resend error',
        })
        return {
          success: false,
          error: result.error.message || 'Failed to send email',
        }
      }

      logger.info('Email sent successfully', {
        ...logContext,
        messageId: result.data?.id,
      })

      return {
        success: true,
        messageId: result.data?.id,
      }
    } catch (error: unknown) {
      logger.error('Email send exception', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Fallback: Log that email was received (without sensitive content)
  logger.info('Email queued in fallback mode', {
    ...logContext,
    mode: 'fallback',
    reason: 'RESEND_API_KEY not configured',
  })

  // In development, also show a summary to help debugging
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Email fallback details', {
      from: maskEmail(from),
      to: maskEmails(to),
      subject,
      htmlLength: html.length,
      textLength: text?.length ?? 0,
    })
  }

  return {
    success: true,
    messageId: `fallback-${Date.now()}`,
  }
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return resendClient !== null
}

/**
 * Get the default "from" address
 */
export function getDefaultFrom(): string {
  return DEFAULT_FROM
}
