/**
 * GDPR Identity Verification Utility
 *
 * COMP-001: Verify user identity before processing GDPR requests
 * Required to prevent unauthorized data access or deletion
 */

import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

/**
 * Verification token expiry time (15 minutes)
 */
const TOKEN_EXPIRY_MS = 15 * 60 * 1000

/**
 * Generate a secure verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Verify user password for sensitive operations
 *
 * @param userId - User ID to verify
 * @param password - Password to verify
 * @returns True if password is correct
 */
export async function verifyPassword(
  userId: string,
  password: string
): Promise<boolean> {
  const supabase = await createClient()

  // Get user email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single()

  if (!profile?.email) {
    return false
  }

  // Try to sign in with the provided password
  // This is the safest way to verify the password
  const { error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  })

  return !error
}

/**
 * Create a verification request for email-based verification
 *
 * @param userId - User ID requesting verification
 * @param requestId - GDPR request ID
 * @returns Verification token
 */
export async function createEmailVerification(
  userId: string,
  requestId: string
): Promise<string> {
  const supabase = await createClient()
  const token = generateVerificationToken()
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString()

  await supabase
    .from('gdpr_requests')
    .update({
      verification_token: token,
      verification_expires_at: expiresAt,
      status: 'identity_verification',
    })
    .eq('id', requestId)
    .eq('user_id', userId)

  return token
}

/**
 * Verify an email verification token
 *
 * @param requestId - GDPR request ID
 * @param token - Verification token
 * @returns True if token is valid
 */
export async function verifyEmailToken(
  requestId: string,
  token: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data: request } = await supabase
    .from('gdpr_requests')
    .select('verification_token, verification_expires_at')
    .eq('id', requestId)
    .single()

  if (!request) {
    return false
  }

  // Check token matches
  if (request.verification_token !== token) {
    return false
  }

  // Check not expired
  if (new Date(request.verification_expires_at) < new Date()) {
    return false
  }

  // Mark as verified
  await supabase
    .from('gdpr_requests')
    .update({
      status: 'processing',
      verification_token: null,
      verification_expires_at: null,
    })
    .eq('id', requestId)

  return true
}

/**
 * Send verification email for GDPR request
 *
 * @param userId - User ID
 * @param requestId - GDPR request ID
 * @param requestType - Type of GDPR request
 */
export async function sendVerificationEmail(
  userId: string,
  requestId: string,
  requestType: string
): Promise<void> {
  const supabase = await createClient()

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, tenant_id, tenants(name)')
    .eq('id', userId)
    .single()

  if (!profile?.email) {
    throw new Error('Usuario sin email registrado')
  }

  // Create verification token
  const token = await createEmailVerification(userId, requestId)

  // Build verification URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const verifyUrl = `${baseUrl}/api/gdpr/verify?request=${requestId}&token=${token}`

  // Get request type label
  const requestTypeLabels: Record<string, string> = {
    access: 'Acceso a datos personales',
    erasure: 'Eliminación de cuenta',
    portability: 'Exportación de datos',
    rectification: 'Corrección de datos',
  }

  const requestLabel = requestTypeLabels[requestType] || requestType

  // Send email (using existing email infrastructure)
  // This would integrate with your email sending service
  const emailContent = {
    to: profile.email,
    subject: `Verificación de solicitud GDPR - ${requestLabel}`,
    html: `
      <h1>Verificación de Identidad</h1>
      <p>Hola ${profile.full_name},</p>
      <p>Has solicitado: <strong>${requestLabel}</strong></p>
      <p>Para confirmar tu identidad y procesar esta solicitud, haz clic en el siguiente enlace:</p>
      <p>
        <a href="${verifyUrl}" style="
          display: inline-block;
          background-color: #4F46E5;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
        ">
          Verificar mi identidad
        </a>
      </p>
      <p>Este enlace expira en 15 minutos.</p>
      <p>Si no solicitaste esto, puedes ignorar este email.</p>
      <hr />
      <p style="color: #666; font-size: 12px;">
        ${((profile.tenants as Array<{ name: string }>)?.[0]?.name) || 'Veterinaria'}
      </p>
    `,
  }

  // Send email using the unified email service
  const { sendEmail } = await import('@/lib/email/service')
  
  try {
    const result = await sendEmail({
      to: emailContent.to,
      subject: emailContent.subject,
      html: emailContent.html,
      priority: 'high',
      tags: ['gdpr', 'verification', requestType],
    })

    if (!result.success) {
      throw new Error(`Failed to send verification email: ${result.error}`)
    }
  } catch (error) {
    // Log error but don't fail the verification process
    console.error('[GDPR] Failed to send verification email:', error)
    
    // In development, still log the content for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn('[GDPR] Email content that failed to send:', {
        to: emailContent.to,
        subject: emailContent.subject,
      })
    }
    
    // Re-throw error as this is critical for GDPR compliance
    throw error
  }
}

/**
 * Check if user has verified their identity for a request
 *
 * @param requestId - GDPR request ID
 * @returns True if identity is verified
 */
export async function isIdentityVerified(requestId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: request } = await supabase
    .from('gdpr_requests')
    .select('status')
    .eq('id', requestId)
    .single()

  return request?.status === 'processing' || request?.status === 'completed'
}

/**
 * Rate limit GDPR requests to prevent abuse
 *
 * @param userId - User ID
 * @param requestType - Type of request
 * @returns True if request is allowed
 */
export async function checkRateLimit(
  userId: string,
  requestType: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const supabase = await createClient()

  // Check requests in the last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: recentRequests } = await supabase
    .from('gdpr_requests')
    .select('created_at')
    .eq('user_id', userId)
    .eq('request_type', requestType)
    .gte('created_at', oneDayAgo)

  // Limits per request type
  const limits: Record<string, number> = {
    access: 5, // 5 data exports per day
    erasure: 1, // 1 deletion request per day
    portability: 3, // 3 portability exports per day
    rectification: 10, // 10 rectification requests per day
  }

  const limit = limits[requestType] || 5
  const count = recentRequests?.length || 0

  if (count >= limit) {
    // Calculate retry after (next day)
    const oldestRequest = recentRequests?.[0]?.created_at
    const retryAfter = oldestRequest
      ? new Date(oldestRequest).getTime() + 24 * 60 * 60 * 1000 - Date.now()
      : 24 * 60 * 60 * 1000

    return {
      allowed: false,
      retryAfter: Math.ceil(retryAfter / 1000), // seconds
    }
  }

  return { allowed: true }
}

/**
 * Verify user owns the account (for admin-initiated deletions)
 *
 * @param adminUserId - Admin user ID
 * @param targetUserId - Target user ID to delete
 * @param tenantId - Tenant ID
 * @returns True if admin has permission
 */
export async function verifyAdminPermission(
  adminUserId: string,
  targetUserId: string,
  tenantId: string
): Promise<boolean> {
  const supabase = await createClient()

  // Check admin is staff of the same tenant
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', adminUserId)
    .single()

  if (!adminProfile) return false
  if (adminProfile.tenant_id !== tenantId) return false
  if (adminProfile.role !== 'admin') return false

  // Check target user belongs to same tenant
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', targetUserId)
    .single()

  if (!targetProfile) return false
  if (targetProfile.tenant_id !== tenantId) return false

  return true
}
