/**
 * Notification Service
 *
 * Unified notification system for multi-channel delivery
 */

import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/email/service'
import { createClient } from '@/lib/supabase/server'
import type { 
  NotificationPayload, 
  NotificationResult, 
  ChannelResult, 
  InAppNotification,
  NotificationType,
  NotificationChannel,
} from './types'

/**
 * @deprecated Use sendNotification from '@/lib/notifications' instead
 */
export async function sendConfirmationEmail(options: {
  to: string
  subject: string
  body: string
}) {
  logger.warn(
    'sendConfirmationEmail is deprecated. Use sendNotification from @/lib/notifications instead'
  )

  // This function no longer has access to user/tenant context
  // Return simulated success for backwards compatibility
  return { success: true, message: 'Email enviado (simulado)' }
}

/**
 * @deprecated Use sendNotification from '@/lib/notifications' instead
 */
export async function sendReminderNotification(options: {
  to: string
  type: 'email' | 'sms'
  message: string
}) {
  logger.warn(
    'sendReminderNotification is deprecated. Use sendNotification from @/lib/notifications instead'
  )

  // Return simulated success for backwards compatibility
  return { success: true, message: 'Recordatorio enviado (simulado)' }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get user email for notifications
 */
async function getUserEmail(userId: string, tenantId: string): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .single()

    return profile?.email || null
  } catch (error) {
    logger.error('Failed to get user email', { userId, tenantId, error })
    return null
  }
}

/**
 * Get staff members for notification
 */
async function getStaffMembers(
  tenantId: string, 
  roles?: string[]
): Promise<Array<{ id: string; email: string; role: string }>> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('profiles')
      .select('id, email, role')
      .eq('tenant_id', tenantId)
      .neq('role', 'owner')
      .not('email', 'is', null)

    if (roles && roles.length > 0) {
      query = query.in('role', roles)
    }

    const { data: staff } = await query
    return staff || []
  } catch (error) {
    logger.error('Failed to get staff members', { tenantId, roles, error })
    return []
  }
}

/**
 * Generate notification subject based on type
 */
function generateSubject(type: NotificationType, title: string): string {
  const subjects: Record<string, string> = {
    appointment_reminder: 'Recordatorio de Cita - {{title}}',
    lab_results_ready: 'Resultados de Laboratorio Listos - {{title}}',
    lab_critical_result: 'URGENTE: Resultado Crítico de Laboratorio - {{title}}',
    low_stock_alert: 'Alerta de Stock Bajo - {{title}}',
    order_confirmation: 'Confirmación de Pedido - {{title}}',
    subscription_renewal: 'Renovación de Suscripción - {{title}}',
    waitlist_slot_available: 'Cita Disponible en Lista de Espera - {{title}}',
  }

  const template = subjects[type] || '{{title}}'
  return template.replace('{{title}}', title)
}

/**
 * Generate notification HTML content
 */
function generateEmailHTML(payload: NotificationPayload): string {
  const { title, message, type, data } = payload
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0ea5e9; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          .button { background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
          .urgent { border-left: 4px solid #ef4444; padding-left: 16px; }
          .normal { border-left: 4px solid #0ea5e9; padding-left: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${title}</h2>
          </div>
          <div class="content">
            <div class="${payload.priority === 'urgent' || payload.priority === 'high' ? 'urgent' : 'normal'}">
              <p>${message}</p>
              ${data?.details ? `<p><strong>Detalles:</strong> ${data.details}</p>` : ''}
              ${data?.date ? `<p><strong>Fecha:</strong> ${data.date}</p>` : ''}
              ${data?.time ? `<p><strong>Hora:</strong> ${data.time}</p>` : ''}
              ${payload.actionUrl ? `<p><a href="${payload.actionUrl}" class="button">Ver Detalles</a></p>` : ''}
            </div>
          </div>
          <div class="footer">
            <p>Este correo fue enviado automáticamente por ${process.env.EMAIL_FROM_NAME || 'Vete Platform'}</p>
            <p>Por favor no responda a este correo.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

// =============================================================================
// Channel Implementations
// =============================================================================

/**
 * Send email notification
 */
async function sendEmailNotification(
  payload: NotificationPayload,
  userEmail: string
): Promise<ChannelResult> {
  try {
    const subject = payload.email?.subject || generateSubject(payload.type, payload.title)
    const htmlContent = generateEmailHTML(payload)

    const result = await sendEmail({
      to: userEmail,
      subject,
      text: payload.message,
      html: htmlContent,
      replyTo: payload.email?.replyTo,
      priority: payload.priority === 'urgent' || payload.priority === 'high' ? 'high' : 'normal',
      tags: [payload.type, payload.tenantId],
    })

    return {
      channel: 'email',
      success: result.success,
      error: result.error,
      messageId: result.messageId,
    }
  } catch (error) {
    return {
      channel: 'email',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send in-app notification
 */
async function sendInAppNotificationChannel(
  payload: NotificationPayload
): Promise<ChannelResult> {
  try {
    const supabase = await createClient()
    
    const notificationData: Omit<InAppNotification, 'id' | 'created_at'> = {
      user_id: payload.recipientId,
      tenant_id: payload.tenantId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data || {},
      action_url: payload.actionUrl,
      read_at: null,
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select('id')
      .single()

    if (error) throw error

    return {
      channel: 'in_app',
      success: true,
      messageId: data.id,
    }
  } catch (error) {
    return {
      channel: 'in_app',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send SMS notification (placeholder)
 */
async function sendSMSNotification(): Promise<ChannelResult> {
  return {
    channel: 'sms',
    success: false,
    error: 'SMS notifications not implemented yet',
  }
}

/**
 * Send push notification (placeholder)
 */
async function sendPushNotification(): Promise<ChannelResult> {
  return {
    channel: 'push',
    success: false,
    error: 'Push notifications not implemented yet',
  }
}

// =============================================================================
// Main Notification Functions
// =============================================================================

/**
 * Send notification to user
 */
export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
  logger.info('Sending notification', { 
    type: payload.type, 
    channels: payload.channels,
    recipientId: payload.recipientId,
    tenantId: payload.tenantId 
  })

  const results: ChannelResult[] = []
  const errors: string[] = []

  // Get user email if email channel is requested
  let userEmail: string | null = null
  if (payload.channels.includes('email')) {
    userEmail = await getUserEmail(payload.recipientId, payload.tenantId)
    if (!userEmail) {
      errors.push('User email not found for email notification')
    }
  }

  // Send notifications for each channel
  for (const channel of payload.channels) {
    let result: ChannelResult

    switch (channel) {
      case 'email':
        if (userEmail) {
          result = await sendEmailNotification(payload, userEmail)
        } else {
          result = {
            channel: 'email',
            success: false,
            error: 'No email address available',
          }
        }
        break

      case 'in_app':
        result = await sendInAppNotificationChannel(payload)
        break

      case 'sms':
        result = await sendSMSNotification()
        break

      case 'push':
        result = await sendPushNotification()
        break

      default:
        result = {
          channel: channel as NotificationChannel,
          success: false,
          error: `Unsupported channel: ${channel}`,
        }
    }

    results.push(result)
    
    if (!result.success && result.error) {
      errors.push(`${result.channel}: ${result.error}`)
    }
  }

  const success = results.some(r => r.success)

  logger.info('Notification sent', {
    type: payload.type,
    success,
    channels: results.map(r => ({ channel: r.channel, success: r.success })),
    errors,
  })

  return {
    success,
    notificationId: results.find(r => r.success)?.messageId,
    channels: results,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Send in-app notification
 */
export async function sendInAppNotification(payload: {
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
}): Promise<NotificationResult> {
  logger.info('Sending in-app notification', { userId: payload.userId, type: payload.type })

  // Convert to NotificationPayload format
  const notificationPayload: NotificationPayload = {
    type: payload.type as NotificationType,
    recipientId: payload.userId,
    recipientType: 'user',
    tenantId: '', // Will be filled by calling code
    title: payload.title,
    message: payload.message,
    channels: ['in_app'],
    data: payload.data,
  }

  // Get tenant ID from user profile
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', payload.userId)
    .single()

  if (!profile?.tenant_id) {
    return {
      success: false,
      channels: [{
        channel: 'in_app',
        success: false,
        error: 'User tenant not found',
      }],
      errors: ['User tenant not found'],
    }
  }

  notificationPayload.tenantId = profile.tenant_id
  
  const result = await sendInAppNotificationChannel(notificationPayload)
  
  return {
    success: result.success,
    notificationId: result.messageId,
    channels: [result],
    errors: result.error ? [result.error] : undefined,
  }
}

/**
 * Notify staff members
 */
export async function notifyStaff(payload: {
  tenantId: string
  type: string
  title: string
  message: string
  channels?: NotificationChannel[]
  roles?: string[]
  data?: Record<string, unknown>
}): Promise<NotificationResult> {
  logger.info('Notifying staff', { 
    tenantId: payload.tenantId, 
    type: payload.type, 
    channels: payload.channels,
    roles: payload.roles 
  })

  const channels = payload.channels || ['in_app', 'email']
  const staffMembers = await getStaffMembers(payload.tenantId, payload.roles)

  if (staffMembers.length === 0) {
    return {
      success: false,
      channels: [],
      errors: ['No staff members found for notification'],
    }
  }

  const allResults: ChannelResult[] = []
  const allErrors: string[] = []
  let anySuccess = false

  // Send notification to each staff member
  for (const staff of staffMembers) {
    const staffPayload: NotificationPayload = {
      type: payload.type as NotificationType,
      recipientId: staff.id,
      recipientType: 'staff',
      tenantId: payload.tenantId,
      title: payload.title,
      message: payload.message,
      channels: channels,
      data: { ...payload.data, staffRole: staff.role },
    }

    const result = await sendNotification(staffPayload)
    
    if (result.success) {
      anySuccess = true
    }
    
    allResults.push(...result.channels)
    
    if (result.errors) {
      allErrors.push(...result.errors)
    }
  }

  return {
    success: anySuccess,
    channels: allResults,
    errors: allErrors.length > 0 ? allErrors : undefined,
  }
}
