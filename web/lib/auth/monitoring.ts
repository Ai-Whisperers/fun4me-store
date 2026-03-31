/**
 * Auth Monitoring - Failed Login Detection
 * Epic: S004 - Auth Hardening
 * Task: T002 - Implement failed login monitoring
 */

import { createClient } from '@/lib/supabase/client'
import { headers } from 'next/headers'

export interface AuthAttempt {
  email: string
  success: boolean
  ip?: string
  userAgent?: string
  failureReason?: string
}

export interface AuthAttemptAlert {
  type: 'repeated_failures' | 'ip_abuse' | 'suspicious_activity'
  email?: string
  ip?: string
  attemptCount: number
  timeWindow: string
  details: Record<string, unknown>
}

/**
 * Log an authentication attempt to the database
 */
export async function logAuthAttempt(attempt: AuthAttempt): Promise<void> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('auth_logs')
      .insert({
        email: attempt.email,
        success: attempt.success,
        ip: attempt.ip,
        user_agent: attempt.userAgent,
        failure_reason: attempt.failureReason,
        timestamp: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to log auth attempt:', error)
    }
  } catch (error) {
    console.error('Error in logAuthAttempt:', error)
  }
}

/**
 * Helper to get client info from Next.js headers
 */
export async function getClientInfo() {
  try {
    const headersList = await headers()
    return {
      ip: headersList.get('x-forwarded-for') || 
          headersList.get('x-real-ip') || 
          headersList.get('cf-connecting-ip') ||
          'unknown',
      userAgent: headersList.get('user-agent') || 'unknown'
    }
  } catch {
    return {
      ip: 'unknown',
      userAgent: 'unknown'
    }
  }
}

/**
 * Log a successful login
 */
export async function logSuccessfulLogin(email: string): Promise<void> {
  const clientInfo = await getClientInfo()
  
  await logAuthAttempt({
    email,
    success: true,
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent
  })
}

/**
 * Log a failed login attempt
 */
export async function logFailedLogin(
  email: string, 
  reason: string = 'authentication_failed'
): Promise<void> {
  const clientInfo = await getClientInfo()
  
  await logAuthAttempt({
    email,
    success: false,
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
    failureReason: reason
  })
}

/**
 * Check for suspicious login patterns
 * Returns alerts if thresholds are exceeded
 */
export async function checkSuspiciousActivity(
  email?: string,
  ip?: string
): Promise<AuthAttemptAlert[]> {
  try {
    const supabase = createClient()
    const alerts: AuthAttemptAlert[] = []
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    
    // Check for repeated failures from same email
    if (email) {
      const { data: emailFailures, error } = await supabase
        .from('auth_logs')
        .select('id')
        .eq('email', email)
        .eq('success', false)
        .gte('timestamp', fifteenMinutesAgo)
      
      if (!error && emailFailures && emailFailures.length >= 5) {
        alerts.push({
          type: 'repeated_failures',
          email,
          attemptCount: emailFailures.length,
          timeWindow: '15 minutes',
          details: { threshold: 5 }
        })
      }
    }
    
    // Check for repeated failures from same IP
    if (ip && ip !== 'unknown') {
      const { data: ipFailures, error } = await supabase
        .from('auth_logs')
        .select('id')
        .eq('ip', ip)
        .eq('success', false)
        .gte('timestamp', fifteenMinutesAgo)
      
      if (!error && ipFailures && ipFailures.length >= 10) {
        alerts.push({
          type: 'ip_abuse',
          ip,
          attemptCount: ipFailures.length,
          timeWindow: '15 minutes',
          details: { threshold: 10 }
        })
      }
    }
    
    return alerts
  } catch (error) {
    console.error('Error checking suspicious activity:', error)
    return []
  }
}

/**
 * Wrapper for Supabase auth operations with monitoring
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAuthMonitoring<T extends (...args: any[]) => Promise<any>>(
  authOperation: T,
  operationName: string
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (...args: any[]) => {
    try {
      const result = await authOperation(...args)
      
      // For sign-in operations, extract email and check result
      if (operationName.includes('signIn') && args[0]?.email) {
        const email = args[0].email
        
        if (result.error) {
          await logFailedLogin(email, result.error.message)
          
          // Check for suspicious patterns
          const clientInfo = await getClientInfo()
          const alerts = await checkSuspiciousActivity(email, clientInfo.ip)
          
          if (alerts.length > 0) {
            console.warn('Suspicious auth activity detected:', alerts)
            // Here you could integrate with alerting systems
            // await sendSecurityAlert(alerts)
          }
        } else if (result.data?.user) {
          await logSuccessfulLogin(email)
        }
      }
      
      return result
    } catch (error) {
      console.error(`Error in monitored auth operation ${operationName}:`, error)
      throw error
    }
  }) as T
}

/**
 * Get recent auth activity summary (for admin dashboards)
 */
export async function getAuthActivitySummary(hours: number = 24) {
  try {
    const supabase = createClient()
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    
    // Get total attempts
    const { count: totalAttempts } = await supabase
      .from('auth_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', since)
    
    // Get successful attempts
    const { count: successfulAttempts } = await supabase
      .from('auth_logs')
      .select('*', { count: 'exact', head: true })
      .eq('success', true)
      .gte('timestamp', since)
    
    // Get failed attempts
    const { count: failedAttempts } = await supabase
      .from('auth_logs')
      .select('*', { count: 'exact', head: true })
      .eq('success', false)
      .gte('timestamp', since)
    
    // Get top failure reasons
    const { data: failureReasons } = await supabase
      .from('auth_logs')
      .select('failure_reason')
      .eq('success', false)
      .not('failure_reason', 'is', null)
      .gte('timestamp', since)
    
    const reasonCounts = failureReasons?.reduce((acc, item) => {
      acc[item.failure_reason] = (acc[item.failure_reason] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    return {
      totalAttempts: totalAttempts || 0,
      successfulAttempts: successfulAttempts || 0,
      failedAttempts: failedAttempts || 0,
      failureReasons: reasonCounts,
      timeWindow: `${hours} hours`,
      generatedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error getting auth activity summary:', error)
    return null
  }
}