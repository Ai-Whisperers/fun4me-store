/**
 * Ambassador Approval Email Template
 *
 * Sent when a new ambassador application is approved
 */

import { sendEmail } from '../client'

export interface AmbassadorApprovalEmailData {
  to: string
  name: string
  referralCode: string
  tier: string
  commissionRate: number
}

const TIER_LABELS: Record<string, string> = {
  embajador: 'Embajador',
  promotor: 'Promotor',
  super: 'Super Embajador',
}

/**
 * Generate ambassador approval email HTML
 */
function generateApprovalEmailHtml(data: AmbassadorApprovalEmailData): string {
  const { name, referralCode, tier, commissionRate } = data
  const tierLabel = TIER_LABELS[tier] || 'Embajador'
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vetic.com'}/signup?amb=${referralCode}`

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido al Programa de Embajadores</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Vetic</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Programa de Embajadores</p>
            </td>
          </tr>

          <!-- Icon & Title -->
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
              <h2 style="margin: 0 0 10px; color: #333333; font-size: 24px; font-weight: 600;">¡Felicitaciones, ${name}!</h2>
              <p style="margin: 0; color: #666666; font-size: 16px;">Tu solicitud ha sido aprobada</p>
            </td>
          </tr>

          <!-- Welcome Message -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <p style="margin: 0 0 15px; color: #666666; font-size: 16px; line-height: 1.5;">
                Bienvenido al <strong>Programa de Embajadores de Vetic</strong>. Ahora eres parte de nuestra comunidad de profesionales que ayudan a transformar la gestión veterinaria.
              </p>
            </td>
          </tr>

          <!-- Tier & Code Box -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <div style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center;">
                <div style="color: #047857; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
                  Tu nivel: ${tierLabel}
                </div>
                <div style="color: #065f46; font-size: 28px; font-weight: 700; font-family: monospace; margin-bottom: 12px;">
                  ${referralCode}
                </div>
                <div style="color: #059669; font-size: 14px;">
                  Comisión: <strong>${commissionRate}%</strong> del primer año de suscripción
                </div>
              </div>
            </td>
          </tr>

          <!-- Benefits -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <h3 style="margin: 0 0 15px; color: #333333; font-size: 18px;">Tus beneficios:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; color: #059669; font-size: 24px; vertical-align: top; width: 40px;">✓</td>
                  <td style="padding: 10px; color: #666666; font-size: 14px; line-height: 1.4;">
                    <strong>Plan Professional de por vida</strong><br>
                    Acceso completo a todas las funciones premium
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; color: #059669; font-size: 24px; vertical-align: top;">✓</td>
                  <td style="padding: 10px; color: #666666; font-size: 14px; line-height: 1.4;">
                    <strong>${commissionRate}% de comisión</strong><br>
                    Por cada clínica que se suscriba usando tu código
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; color: #059669; font-size: 24px; vertical-align: top;">✓</td>
                  <td style="padding: 10px; color: #666666; font-size: 14px; line-height: 1.4;">
                    <strong>Soporte prioritario</strong><br>
                    Acceso directo a nuestro equipo de soporte
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Share Link -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; border-radius: 4px;">
                <strong style="color: #0369a1; font-size: 14px; display: block; margin-bottom: 8px;">🔗 Tu enlace para compartir:</strong>
                <p style="margin: 0; color: #0c4a6e; font-size: 14px; word-break: break-all;">
                  ${shareUrl}
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 25px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vetic.com'}/ambassador" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                Ir a mi Panel
              </a>
            </td>
          </tr>

          <!-- Next Steps -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <h3 style="margin: 0 0 15px; color: #333333; font-size: 18px;">Próximos pasos:</h3>
              <ol style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                <li style="margin-bottom: 8px;">Comparte tu código con clínicas veterinarias de tu red</li>
                <li style="margin-bottom: 8px;">Cuando se registren, recibirás notificaciones de cada nuevo referido</li>
                <li style="margin-bottom: 8px;">Cuando se conviertan en clientes de pago, tu comisión se acreditará</li>
                <li>Solicita tu pago cuando alcances el mínimo de Gs 100.000</li>
              </ol>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; text-align: center; line-height: 1.5;">
                ¡Gracias por ser parte de la transformación veterinaria!
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                Si tienes preguntas, responde a este correo o escríbenos a embajadores@vetic.com
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
 * Send ambassador approval email
 */
export async function sendAmbassadorApprovalEmail(data: AmbassadorApprovalEmailData) {
  return sendEmail({
    to: data.to,
    subject: '🎉 ¡Bienvenido al Programa de Embajadores de Vetic!',
    html: generateApprovalEmailHtml(data),
  })
}
