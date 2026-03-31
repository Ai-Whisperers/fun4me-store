/**
 * Cron Job Alerting Service
 *
 * Sends alerts when cron jobs fail or become unhealthy.
 * Integrates with the cron tracking system to monitor job health.
 *
 * Alert Channels:
 * - Slack webhook (if configured)
 * - Email via platform notification system
 * - Database logging for audit trail
 */

import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'

// =============================================================================
// Types
// =============================================================================

export interface AlertPayload {
  jobName: string
  severity: 'warning' | 'critical'
  message: string
  details?: {
    lastRun?: string
    expectedInterval?: number
    error?: string
    runId?: string
  }
}

interface SlackMessage {
  text: string
  blocks?: SlackBlock[]
}

interface SlackBlock {
  type: string
  text?: { type: string; text: string; emoji?: boolean }
  fields?: { type: string; text: string }[]
}

// =============================================================================
// Alert Functions
// =============================================================================

/**
 * Send alert for a failed or unhealthy cron job.
 * Attempts multiple channels (Slack, email, DB logging).
 */
export async function sendCronAlert(payload: AlertPayload): Promise<void> {
  const { jobName, severity, message, details } = payload

  logger.warn(`Cron alert: ${severity} - ${jobName}`, { message, details })

  // Log to database for audit trail
  await logAlertToDatabase(payload)

  // Send to Slack if configured
  if (process.env.SLACK_CRON_WEBHOOK_URL) {
    await sendSlackAlert(payload)
  }

  // Send email for critical alerts
  if (severity === 'critical') {
    await sendEmailAlert(payload)
  }
}

/**
 * Log alert to database for audit trail.
 */
async function logAlertToDatabase(payload: AlertPayload): Promise<void> {
  try {
    const supabase = await createServiceClient()

    await supabase.from('cron_alerts').insert({
      job_name: payload.jobName,
      severity: payload.severity,
      message: payload.message,
      details: payload.details || {},
      created_at: new Date().toISOString(),
    })
  } catch (error: unknown) {
    // Don't fail alerting if DB logging fails
    logger.warn('Failed to log cron alert to database', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }
}

/**
 * Send alert to Slack webhook.
 */
async function sendSlackAlert(payload: AlertPayload): Promise<void> {
  const webhookUrl = process.env.SLACK_CRON_WEBHOOK_URL
  if (!webhookUrl) return

  const emoji = payload.severity === 'critical' ? '🚨' : '⚠️'
  const color = payload.severity === 'critical' ? '#dc2626' : '#f59e0b'

  const message: SlackMessage = {
    text: `${emoji} Cron Job Alert: ${payload.jobName}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Cron Job Alert`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Job:*\n${payload.jobName}` },
          { type: 'mrkdwn', text: `*Severity:*\n${payload.severity.toUpperCase()}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Message:*\n${payload.message}`,
        },
      },
    ],
  }

  if (payload.details?.lastRun) {
    message.blocks?.push({
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Last Run:*\n${payload.details.lastRun}` },
        { type: 'mrkdwn', text: `*Error:*\n${payload.details.error || 'N/A'}` },
      ],
    })
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
  } catch (error: unknown) {
    logger.warn('Failed to send Slack alert', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }
}

/**
 * Send email alert for critical issues.
 */
async function sendEmailAlert(payload: AlertPayload): Promise<void> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL
  if (!adminEmail) return

  try {
    const supabase = await createServiceClient()

    // Use platform notification system
    await supabase.from('platform_notifications').insert({
      recipient_email: adminEmail,
      type: 'cron_alert',
      subject: `🚨 Critical Cron Alert: ${payload.jobName}`,
      body: `
Job: ${payload.jobName}
Severity: ${payload.severity.toUpperCase()}
Message: ${payload.message}
${payload.details?.lastRun ? `Last Run: ${payload.details.lastRun}` : ''}
${payload.details?.error ? `Error: ${payload.details.error}` : ''}

Please investigate immediately.
      `.trim(),
      metadata: {
        job_name: payload.jobName,
        severity: payload.severity,
        details: payload.details,
      },
      created_at: new Date().toISOString(),
    })
  } catch (error: unknown) {
    logger.warn('Failed to send email alert', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }
}

// =============================================================================
// Health Check Alert Integration
// =============================================================================

/**
 * Check cron health and send alerts for unhealthy jobs.
 * Should be called periodically (e.g., every 5 minutes).
 */
export async function checkAndAlertUnhealthyJobs(): Promise<{
  checked: number
  alerts: number
}> {
  try {
    // Call health check endpoint internally
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/health/cron`)
    const health = await response.json()

    if (!health.jobs || !Array.isArray(health.jobs)) {
      return { checked: 0, alerts: 0 }
    }

    let alertsSent = 0

    for (const job of health.jobs) {
      // Send alert for critical status
      if (job.status === 'critical') {
        await sendCronAlert({
          jobName: job.name,
          severity: 'critical',
          message: job.message,
          details: {
            lastRun: job.lastRun,
            error: job.message,
          },
        })
        alertsSent++
      }
      // Send warning for first-time warnings (avoid spam)
      else if (job.status === 'warning' && !job.healthy) {
        await sendCronAlert({
          jobName: job.name,
          severity: 'warning',
          message: job.message,
          details: {
            lastRun: job.lastRun,
          },
        })
        alertsSent++
      }
    }

    return {
      checked: health.jobs.length,
      alerts: alertsSent,
    }
  } catch (error: unknown) {
    logger.error('Failed to check cron health for alerting', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return { checked: 0, alerts: 0 }
  }
}

/**
 * Send immediate alert when a cron job fails.
 * Called from trackCronExecution on failure.
 */
export async function alertOnCronFailure(
  jobName: string,
  error: string,
  runId?: string
): Promise<void> {
  // Determine severity based on job criticality
  const criticalJobs = [
    'release-reservations',
    'process-subscriptions',
    'billing/auto-charge',
    'generate-recurring',
  ]

  const severity = criticalJobs.includes(jobName) ? 'critical' : 'warning'

  await sendCronAlert({
    jobName,
    severity,
    message: `Cron job "${jobName}" failed with error: ${error}`,
    details: {
      error,
      runId,
    },
  })
}
