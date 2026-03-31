/**
 * Ambassador Conversion Email Template
 *
 * Sent when a referral converts to paid subscription (commission earned)
 */

import { sendEmail } from '../client'

export interface AmbassadorConversionEmailData {
  to: string
  ambassadorName: string
  clinicName: string
  subscriptionAmount: number
  commissionRate: number
  commissionAmount: number
  newBalance: number
  referralCode: string
  totalConversions: number
  tier: string
}

const TIER_LABELS: Record<string, string> = {
  embajador: 'Embajador',
  promotor: 'Promotor',
  super: 'Super Embajador',
}

/**
 * Generate ambassador conversion email HTML
 */
function generateConversionEmailHtml(data: AmbassadorConversionEmailData): string {
  const {
    ambassadorName,
    clinicName,
    subscriptionAmount,
    commissionRate,
    commissionAmount,
    newBalance,
    totalConversions,
    tier,
  } = data

  const tierLabel = TIER_LABELS[tier] || 'Embajador'
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vetic.com'}/ambassador`

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Nueva Comisión Ganada!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Vetic</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">${tierLabel}</p>
            </td>
          </tr>

          <!-- Icon & Title -->
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 20px;">💰</div>
              <h2 style="margin: 0 0 10px; color: #333333; font-size: 24px; font-weight: 600;">¡Nueva Comisión!</h2>
              <p style="margin: 0; color: #666666; font-size: 16px;">Tu referido se convirtió en cliente</p>
            </td>
          </tr>

          <!-- Commission Details -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <div style="background-color: #f5f3ff; border: 2px solid #8b5cf6; border-radius: 8px; padding: 20px; text-align: center;">
                <div style="color: #6d28d9; font-size: 14px; margin-bottom: 8px;">
                  Comisión ganada
                </div>
                <div style="color: #5b21b6; font-size: 36px; font-weight: 700; margin-bottom: 4px;">
                  Gs ${commissionAmount.toLocaleString()}
                </div>
                <div style="color: #7c3aed; font-size: 14px;">
                  ${commissionRate}% de Gs ${subscriptionAmount.toLocaleString()}
                </div>
              </div>
            </td>
          </tr>

          <!-- Referral Info -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <p style="margin: 0 0 15px; color: #333333; font-size: 16px; line-height: 1.5;">
                Hola <strong>${ambassadorName}</strong>,
              </p>
              <p style="margin: 0; color: #666666; font-size: 16px; line-height: 1.5;">
                ¡Excelentes noticias! <strong>${clinicName}</strong> acaba de convertirse en cliente de pago y has ganado una comisión.
              </p>
            </td>
          </tr>

          <!-- Stats Box -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px; text-align: center; border-right: 1px solid #e5e7eb;">
                      <div style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Conversiones</div>
                      <div style="color: #111827; font-size: 24px; font-weight: 700;">${totalConversions}</div>
                    </td>
                    <td style="padding: 10px; text-align: center;">
                      <div style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Balance Disponible</div>
                      <div style="color: #8b5cf6; font-size: 24px; font-weight: 700;">Gs ${newBalance.toLocaleString()}</div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Tier Upgrade Notice (if close to next tier) -->
          ${
            totalConversions === 4 || totalConversions === 9
              ? `
          <tr>
            <td style="padding: 0 40px 25px;">
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                <strong style="color: #92400e; font-size: 14px; display: block; margin-bottom: 5px;">⭐ ¡Estás cerca!</strong>
                <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">
                  ${totalConversions === 4 ? '¡Una conversión más y subes a Promotor con 40% de comisión!' : '¡Una conversión más y subes a Super Embajador con 50% de comisión!'}
                </p>
              </div>
            </td>
          </tr>
          `
              : ''
          }

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 25px; text-align: center;">
              <a href="${portalUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);">
                Ver mi Panel
              </a>
            </td>
          </tr>

          <!-- Payout Info -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; border-radius: 4px;">
                <strong style="color: #166534; font-size: 14px; display: block; margin-bottom: 5px;">💸 Solicitar pago</strong>
                <p style="margin: 0; color: #15803d; font-size: 14px; line-height: 1.5;">
                  ${newBalance >= 100000 ? 'Tu balance es suficiente para solicitar un pago. ¡Hazlo desde tu panel!' : `Necesitas Gs ${(100000 - newBalance).toLocaleString()} más para solicitar tu primer pago.`}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; text-align: center; line-height: 1.5;">
                ¡Sigue compartiendo tu código para ganar más comisiones!
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                ¿Preguntas? Escríbenos a embajadores@vetic.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Send ambassador conversion email
 */
export async function sendAmbassadorConversionEmail(data: AmbassadorConversionEmailData) {
  return sendEmail({
    to: data.to,
    subject: `💰 ¡Has ganado Gs ${data.commissionAmount.toLocaleString()} en comisión!`,
    html: generateConversionEmailHtml(data),
  })
}
