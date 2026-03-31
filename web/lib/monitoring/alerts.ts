/**
 * Alert Service
 *
 * AUDIT-002: Centralized alerting for cron job failures and system issues.
 * Supports email alerts via Resend.
 */

import { sendEmail } from '@/lib/email'
import { logger } from '@/lib/logger'

// =============================================================================
// Types
// =============================================================================

export type AlertType =
  | 'cron_failure'
  | 'high_error_rate'
  | 'stuck_job'
  | 'system_error'
  | 'security_alert'

export type AlertSeverity = 'warning' | 'error' | 'critical'

export interface AlertPayload {
  type: AlertType
  job: string
  message: string
  details?: Record<string, unknown>
  severity: AlertSeverity
}

// =============================================================================
// Configuration
// =============================================================================

const ALERT_EMAIL = process.env.ALERT_EMAIL
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'VetePlatform'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.veterinaria.com'

// Severity colors for email styling
const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  warning: '#F59E0B', // Amber
  error: '#EF4444', // Red
  critical: '#DC2626', // Dark red
}

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  warning: 'Advertencia',
  error: 'Error',
  critical: 'CRITICO',
}

// =============================================================================
// Email Template
// =============================================================================

function generateAlertEmailHtml(payload: AlertPayload): string {
  const color = SEVERITY_COLORS[payload.severity]
  const label = SEVERITY_LABELS[payload.severity]
  const timestamp = new Date().toLocaleString('es-PY', {
    timeZone: 'America/Asuncion',
    dateStyle: 'full',
    timeStyle: 'medium',
  })

  const detailsHtml = payload.details
    ? Object.entries(payload.details)
        .map(([key, value]) => {
          const displayValue =
            typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
          return `
            <tr>
              <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500; color: #374151;">${key}</td>
              <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;"><pre style="margin: 0; white-space: pre-wrap; font-family: inherit;">${displayValue}</pre></td>
            </tr>
          `
        })
        .join('')
    : ''

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td>
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${color}; border-radius: 8px 8px 0 0;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 20px; font-weight: 600;">
                [${label}] Alerta de ${APP_NAME}
              </h1>
            </td>
          </tr>
        </table>

        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: white; border: 1px solid #e5e7eb; border-top: none;">
          <tr>
            <td style="padding: 24px;">
              <!-- Alert Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px; background-color: #fef3c7; border-radius: 6px; border-left: 4px solid ${color};">
                    <strong style="color: #92400e;">Trabajo:</strong> ${payload.job}<br>
                    <strong style="color: #92400e;">Tipo:</strong> ${payload.type}
                  </td>
                </tr>
              </table>

              <!-- Message -->
              <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 16px;">Mensaje</h3>
                <p style="margin: 0; color: #374151; line-height: 1.5;">${payload.message}</p>
              </div>

              <!-- Details -->
              ${
                detailsHtml
                  ? `
              <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px;">Detalles</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                  ${detailsHtml}
                </table>
              </div>
              `
                  : ''
              }

              <!-- Timestamp -->
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Fecha: ${timestamp}
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <tr>
            <td style="padding: 16px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Esta alerta fue generada automaticamente por ${APP_NAME}.<br>
                <a href="${APP_URL}" style="color: #3b82f6;">Ir al dashboard</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

// =============================================================================
// Alert Functions
// =============================================================================

/**
 * Send an alert notification
 *
 * @param payload - Alert details
 * @returns Promise that resolves when alert is sent (never throws)
 */
export async function sendAlert(payload: AlertPayload): Promise<void> {
  // Always log the alert for Vercel monitoring
  const logMethod = payload.severity === 'warning' ? 'warn' : 'error'
  logger[logMethod](`[ALERT:${payload.severity.toUpperCase()}] ${payload.job}: ${payload.message}`, {
    alertType: payload.type,
    job: payload.job,
    severity: payload.severity,
    details: payload.details,
  })

  // Send email alert if configured
  if (ALERT_EMAIL) {
    try {
      const recipients = ALERT_EMAIL.split(',').map((email) => email.trim())
      const label = SEVERITY_LABELS[payload.severity]

      await sendEmail({
        to: recipients,
        subject: `[${label}] ${payload.job}: ${payload.type.replace('_', ' ')}`,
        html: generateAlertEmailHtml(payload),
        text: `[${label}] ${payload.job}\n\nTipo: ${payload.type}\nMensaje: ${payload.message}\n\nDetalles: ${JSON.stringify(payload.details, null, 2)}`,
      })

      logger.info('Alert email sent', {
        job: payload.job,
        recipients: recipients.length,
      })
    } catch (error: unknown) {
      // Log email failure but don't throw - alerts should never break main flow
      logger.error('Failed to send alert email', {
        error: error instanceof Error ? error.message : String(error),
        job: payload.job,
      })
    }
  }
}

/**
 * Send cron failure alert
 */
export async function sendCronFailureAlert(
  jobName: string,
  error: Error | unknown,
  durationMs?: number
): Promise<void> {
  const errorObj = error instanceof Error ? error : new Error(String(error))

  await sendAlert({
    type: 'cron_failure',
    job: jobName,
    message: errorObj.message,
    details: {
      stack: errorObj.stack?.split('\n').slice(0, 5).join('\n'),
      duration_ms: durationMs,
    },
    severity: 'critical',
  })
}

/**
 * Send high error rate alert
 */
export async function sendHighErrorRateAlert(
  jobName: string,
  errorCount: number,
  totalCount: number,
  sampleErrors: string[]
): Promise<void> {
  const errorRate = totalCount > 0 ? errorCount / totalCount : 0

  await sendAlert({
    type: 'high_error_rate',
    job: jobName,
    message: `${errorCount} errores de ${totalCount} items (${(errorRate * 100).toFixed(1)}%)`,
    details: {
      error_count: errorCount,
      total_count: totalCount,
      error_rate: `${(errorRate * 100).toFixed(1)}%`,
      sample_errors: sampleErrors.slice(0, 5),
    },
    severity: errorRate > 0.5 ? 'critical' : 'warning',
  })
}

/**
 * Send slow job alert
 */
export async function sendSlowJobAlert(jobName: string, durationMs: number): Promise<void> {
  await sendAlert({
    type: 'stuck_job',
    job: jobName,
    message: `El trabajo tomó ${(durationMs / 1000).toFixed(1)} segundos en completarse`,
    details: {
      duration_ms: durationMs,
      duration_seconds: (durationMs / 1000).toFixed(1),
    },
    severity: durationMs > 300000 ? 'error' : 'warning', // >5 min = error
  })
}
