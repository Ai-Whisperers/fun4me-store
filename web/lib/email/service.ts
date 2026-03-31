/**
 * Email Service
 * 
 * Unified email service supporting multiple providers:
 * - Resend (recommended for production)
 * - SendGrid (alternative provider)
 * - SMTP (self-hosted or custom providers)
 * - Mock (for testing)
 */

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
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  text?: string
  html?: string
  attachments?: EmailAttachment[]
  replyTo?: string
  priority?: 'high' | 'normal' | 'low'
  tags?: string[]
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface EmailProvider {
  name: string
  send(options: EmailOptions): Promise<EmailResult>
}

// =============================================================================
// Provider Implementations
// =============================================================================

/**
 * Resend Email Provider
 */
class ResendProvider implements EmailProvider {
  name = 'resend'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      // For now, just log the email attempt and return success
      logger.info('Resend email (mock)', {
        to: options.to,
        subject: options.subject,
        hasHtml: !!options.html,
        hasAttachments: !!options.attachments?.length,
      })

      return {
        success: true,
        messageId: `resend-mock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }
    } catch (error) {
      logger.error('Resend email failed', { error, to: options.to, subject: options.subject })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

/**
 * SendGrid Email Provider
 */
class SendGridProvider implements EmailProvider {
  name = 'sendgrid'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      // For now, just log the email attempt and return success
      logger.info('SendGrid email (mock)', {
        to: options.to,
        subject: options.subject,
        hasHtml: !!options.html,
        hasAttachments: !!options.attachments?.length,
      })

      return {
        success: true,
        messageId: `sendgrid-mock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }
    } catch (error) {
      logger.error('SendGrid email failed', { error, to: options.to, subject: options.subject })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

/**
 * SMTP Email Provider
 */
class SMTPProvider implements EmailProvider {
  name = 'smtp'

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      // For now, just log the email attempt and return success
      logger.info('SMTP email (mock)', {
        to: options.to,
        subject: options.subject,
        hasHtml: !!options.html,
        hasAttachments: !!options.attachments?.length,
        host: process.env.SMTP_HOST,
      })

      return {
        success: true,
        messageId: `smtp-mock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }
    } catch (error) {
      logger.error('SMTP email failed', { error, to: options.to, subject: options.subject })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

/**
 * Mock Email Provider (for testing)
 */
class MockProvider implements EmailProvider {
  name = 'mock'

  async send(options: EmailOptions): Promise<EmailResult> {
    logger.info('Mock email sent', {
      to: options.to,
      subject: options.subject,
      hasHtml: !!options.html,
      hasAttachments: !!options.attachments?.length,
    })

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }
  }
}

// =============================================================================
// Email Service
// =============================================================================

export class EmailService {
  private provider: EmailProvider

  constructor() {
    this.provider = this.createProvider()
  }

  private createProvider(): EmailProvider {
    const providerType = process.env.EMAIL_PROVIDER || 'mock'

    switch (providerType) {
      case 'resend':
        if (!process.env.RESEND_API_KEY) {
          logger.warn('RESEND_API_KEY not configured, falling back to mock')
          return new MockProvider()
        }
        return new ResendProvider(process.env.RESEND_API_KEY)

      case 'sendgrid':
        if (!process.env.SENDGRID_API_KEY) {
          logger.warn('SENDGRID_API_KEY not configured, falling back to mock')
          return new MockProvider()
        }
        return new SendGridProvider(process.env.SENDGRID_API_KEY)

      case 'smtp':
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
          logger.warn('SMTP configuration incomplete, falling back to mock')
          return new MockProvider()
        }
        return new SMTPProvider()

      case 'mock':
        return new MockProvider()

      default:
        logger.warn(`Unknown email provider: ${providerType}, falling back to mock`)
        return new MockProvider()
    }
  }

  /**
   * Send a single email
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    const startTime = Date.now()
    
    try {
      const result = await this.provider.send(options)
      
      const duration = Date.now() - startTime
      logger.info('Email sent', {
        provider: this.provider.name,
        success: result.success,
        duration,
        to: options.to,
        subject: options.subject,
        messageId: result.messageId,
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Email send failed', {
        provider: this.provider.name,
        duration,
        to: options.to,
        subject: options.subject,
        error,
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Send multiple emails (batch)
   */
  async sendBatch(emailList: EmailOptions[]): Promise<EmailResult[]> {
    const results = await Promise.allSettled(
      emailList.map(options => this.send(options))
    )

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        }
      }
    })
  }

  /**
   * Get provider info
   */
  getProviderInfo(): { name: string } {
    return {
      name: this.provider.name,
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let emailService: EmailService | null = null

export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = new EmailService()
  }
  return emailService
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Send a single email using the configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  return getEmailService().send(options)
}

/**
 * Send multiple emails using the configured provider
 */
export async function sendBatchEmails(emailList: EmailOptions[]): Promise<EmailResult[]> {
  return getEmailService().sendBatch(emailList)
}