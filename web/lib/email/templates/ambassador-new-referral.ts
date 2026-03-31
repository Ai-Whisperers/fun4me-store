/**
 * Ambassador New Referral Email Template
 *
 * Sent when a new clinic signs up using an ambassador's referral code
 */

import { sendEmail } from '../client'

export interface AmbassadorNewReferralEmailData {
  to: string
  ambassadorName: string
  clinicName: string
  clinicEmail: string
  referralCode: string
  totalReferrals: number
}

/**
 * Generate ambassador new referral email HTML
 */
function generateNewReferralEmailHtml(data: AmbassadorNewReferralEmailData): string {
  const { ambassadorName, clinicName, totalReferrals, referralCode } = data
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vetic.com'}/ambassador/referrals`

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Nuevo Referido!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Vetic</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Programa de Embajadores</p>
            </td>
          </tr>

          <!-- Icon & Title -->
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 20px;">🎯</div>
              <h2 style="margin: 0 0 10px; color: #333333; font-size: 24px; font-weight: 600;">¡Nuevo Referido!</h2>
              <p style="margin: 0; color: #666666; font-size: 16px;">Una clínica se registró con tu código</p>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <p style="margin: 0 0 15px; color: #333333; font-size: 16px; line-height: 1.5;">
                Hola <strong>${ambassadorName}</strong>,
              </p>
              <p style="margin: 0; color: #666666; font-size: 16px; line-height: 1.5;">
                ¡Excelentes noticias! Alguien usó tu código de referido <strong>${referralCode}</strong> para registrarse en Vetic.
              </p>
            </td>
          </tr>

          <!-- Clinic Info Box -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <div style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px;">
                <div style="color: #0369a1; font-size: 14px; font-weight: 600; margin-bottom: 12px;">
                  Nueva clínica registrada:
                </div>
                <div style="color: #0c4a6e; font-size: 20px; font-weight: 700; margin-bottom: 4px;">
                  ${clinicName}
                </div>
                <div style="color: #0369a1; font-size: 14px;">
                  Estado: <strong style="color: #f59e0b;">En período de prueba</strong>
                </div>
              </div>
            </td>
          </tr>

          <!-- Stats -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; text-align: center;">
                <div style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Total de referidos</div>
                <div style="color: #111827; font-size: 36px; font-weight: 700;">${totalReferrals}</div>
              </div>
            </td>
          </tr>

          <!-- Next Steps -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                <strong style="color: #92400e; font-size: 14px; display: block; margin-bottom: 5px;">⏳ Próximo paso</strong>
                <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">
                  Cuando esta clínica se suscriba a un plan de pago, recibirás tu comisión automáticamente. Te notificaremos cuando eso suceda.
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 25px; text-align: center;">
              <a href="${portalUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(14, 165, 233, 0.3);">
                Ver mis Referidos
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; text-align: center; line-height: 1.5;">
                ¡Sigue compartiendo tu código para ganar más!
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                Tu código: <strong style="font-family: monospace;">${referralCode}</strong>
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
 * Send ambassador new referral email
 */
export async function sendAmbassadorNewReferralEmail(data: AmbassadorNewReferralEmailData) {
  return sendEmail({
    to: data.to,
    subject: `🎯 ¡${data.clinicName} se registró con tu código!`,
    html: generateNewReferralEmailHtml(data),
  })
}
