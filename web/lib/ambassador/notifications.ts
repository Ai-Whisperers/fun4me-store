/**
 * Ambassador Notification Utilities
 *
 * Sends WhatsApp and email notifications to ambassadors using templates.
 */

import { sendWhatsAppMessage, isWhatsAppConfigured } from '@/lib/whatsapp/client'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export interface AmbassadorNotificationResult {
  success: boolean
  whatsappSent?: boolean
  emailSent?: boolean
  error?: string
}

/**
 * Template variable replacer
 */
function replaceVariables(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key]?.toString() || match
  })
}

/**
 * Get template from database by code
 */
async function getTemplate(code: string): Promise<{
  content: string
  subject: string
  channels: string[]
  variables: string[]
} | null> {
  const supabase = await createClient('service_role')

  const { data: template, error } = await supabase
    .from('message_templates')
    .select('content, subject, channels, variables')
    .eq('code', code)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (error || !template) {
    logger.warn('Template not found', { code, error: error?.message })
    return null
  }

  return template
}

/**
 * Send welcome notification to new ambassador
 */
export async function sendAmbassadorWelcomeNotification(
  ambassador: {
    full_name: string
    phone: string
    email: string
    referral_code: string
  }
): Promise<AmbassadorNotificationResult> {
  const template = await getTemplate('AMB_WELCOME')
  if (!template) {
    return { success: false, error: 'Template not found' }
  }

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vete.app'}/ambassador`
  const variables = {
    ambassador_name: ambassador.full_name,
    referral_code: ambassador.referral_code,
    dashboard_url: dashboardUrl,
  }

  const content = replaceVariables(template.content, variables)
  let whatsappSent = false

  // Send WhatsApp if configured and ambassador has phone
  if (isWhatsAppConfigured() && ambassador.phone && template.channels.includes('whatsapp')) {
    const result = await sendWhatsAppMessage({
      to: ambassador.phone,
      body: content,
    })
    whatsappSent = result.success

    if (!result.success) {
      logger.warn('Failed to send ambassador welcome WhatsApp', {
        email: ambassador.email,
        error: result.error,
      })
    }
  }

  return {
    success: true,
    whatsappSent,
    emailSent: false, // Email handled separately via sendAmbassadorApprovalEmail
  }
}

/**
 * Send new referral notification to ambassador
 */
export async function sendAmbassadorNewReferralNotification(
  ambassador: {
    full_name: string
    phone: string
    email: string
  },
  clinicName: string,
  commissionRate: number
): Promise<AmbassadorNotificationResult> {
  const template = await getTemplate('AMB_NEW_REFERRAL')
  if (!template) {
    return { success: false, error: 'Template not found' }
  }

  const variables = {
    ambassador_name: ambassador.full_name,
    clinic_name: clinicName,
    commission_rate: commissionRate.toString(),
  }

  const content = replaceVariables(template.content, variables)
  let whatsappSent = false

  if (isWhatsAppConfigured() && ambassador.phone && template.channels.includes('whatsapp')) {
    const result = await sendWhatsAppMessage({
      to: ambassador.phone,
      body: content,
    })
    whatsappSent = result.success
  }

  return { success: true, whatsappSent }
}

/**
 * Send conversion notification to ambassador
 */
export async function sendAmbassadorConversionNotification(
  ambassador: {
    full_name: string
    phone: string
    email: string
    pending_payout: number
  },
  clinicName: string,
  commissionAmount: number,
  commissionRate: number
): Promise<AmbassadorNotificationResult> {
  const template = await getTemplate('AMB_CONVERSION')
  if (!template) {
    return { success: false, error: 'Template not found' }
  }

  const variables = {
    ambassador_name: ambassador.full_name,
    clinic_name: clinicName,
    commission_amount: commissionAmount.toLocaleString('es-PY'),
    commission_rate: commissionRate.toString(),
    total_balance: ambassador.pending_payout.toLocaleString('es-PY'),
  }

  const content = replaceVariables(template.content, variables)
  let whatsappSent = false

  if (isWhatsAppConfigured() && ambassador.phone && template.channels.includes('whatsapp')) {
    const result = await sendWhatsAppMessage({
      to: ambassador.phone,
      body: content,
    })
    whatsappSent = result.success
  }

  return { success: true, whatsappSent }
}

/**
 * Send payout processed notification to ambassador
 */
export async function sendAmbassadorPayoutNotification(
  ambassador: {
    full_name: string
    phone: string
    email: string
  },
  amount: number,
  bankName: string
): Promise<AmbassadorNotificationResult> {
  const template = await getTemplate('AMB_PAYOUT_PROCESSED')
  if (!template) {
    return { success: false, error: 'Template not found' }
  }

  const variables = {
    ambassador_name: ambassador.full_name,
    amount: amount.toLocaleString('es-PY'),
    bank_name: bankName,
  }

  const content = replaceVariables(template.content, variables)
  let whatsappSent = false

  if (isWhatsAppConfigured() && ambassador.phone && template.channels.includes('whatsapp')) {
    const result = await sendWhatsAppMessage({
      to: ambassador.phone,
      body: content,
    })
    whatsappSent = result.success
  }

  return { success: true, whatsappSent }
}

/**
 * Send tier upgrade notification to ambassador
 */
export async function sendAmbassadorTierUpgradeNotification(
  ambassador: {
    full_name: string
    phone: string
    email: string
  },
  newTier: string,
  conversions: number,
  newCommissionRate: number
): Promise<AmbassadorNotificationResult> {
  const template = await getTemplate('AMB_TIER_UPGRADE')
  if (!template) {
    return { success: false, error: 'Template not found' }
  }

  const tierNames: Record<string, string> = {
    embajador: 'Embajador',
    promotor: 'Promotor',
    super: 'Super Embajador',
  }

  const variables = {
    ambassador_name: ambassador.full_name,
    new_tier: tierNames[newTier] || newTier,
    conversions: conversions.toString(),
    commission_rate: newCommissionRate.toString(),
  }

  const content = replaceVariables(template.content, variables)
  let whatsappSent = false

  if (isWhatsAppConfigured() && ambassador.phone && template.channels.includes('whatsapp')) {
    const result = await sendWhatsAppMessage({
      to: ambassador.phone,
      body: content,
    })
    whatsappSent = result.success
  }

  return { success: true, whatsappSent }
}

/**
 * Send lead follow-up notification to ambassador
 */
export async function sendAmbassadorLeadFollowupNotification(
  ambassador: {
    full_name: string
    phone: string
    referral_code: string
  },
  clinicName: string
): Promise<AmbassadorNotificationResult> {
  const template = await getTemplate('AMB_LEAD_FOLLOWUP')
  if (!template) {
    return { success: false, error: 'Template not found' }
  }

  const variables = {
    ambassador_name: ambassador.full_name,
    clinic_name: clinicName,
    referral_code: ambassador.referral_code,
  }

  const content = replaceVariables(template.content, variables)
  let whatsappSent = false

  if (isWhatsAppConfigured() && ambassador.phone && template.channels.includes('whatsapp')) {
    const result = await sendWhatsAppMessage({
      to: ambassador.phone,
      body: content,
    })
    whatsappSent = result.success
  }

  return { success: true, whatsappSent }
}

/**
 * Send monthly summary notification to ambassador
 */
export async function sendAmbassadorMonthlySummary(
  ambassador: {
    full_name: string
    phone: string
    email: string
  },
  stats: {
    newReferrals: number
    conversions: number
    earnings: number
    pendingBalance: number
  }
): Promise<AmbassadorNotificationResult> {
  const template = await getTemplate('AMB_MONTHLY_SUMMARY')
  if (!template) {
    return { success: false, error: 'Template not found' }
  }

  const variables = {
    ambassador_name: ambassador.full_name,
    new_referrals: stats.newReferrals.toString(),
    conversions: stats.conversions.toString(),
    earnings: stats.earnings.toLocaleString('es-PY'),
    pending_balance: stats.pendingBalance.toLocaleString('es-PY'),
  }

  const content = replaceVariables(template.content, variables)
  let whatsappSent = false

  if (isWhatsAppConfigured() && ambassador.phone && template.channels.includes('whatsapp')) {
    const result = await sendWhatsAppMessage({
      to: ambassador.phone,
      body: content,
    })
    whatsappSent = result.success
  }

  return { success: true, whatsappSent }
}
