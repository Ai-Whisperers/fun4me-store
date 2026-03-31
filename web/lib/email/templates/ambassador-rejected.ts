/**
 * Ambassador Rejection Email Template
 *
 * Sent when an ambassador application is rejected
 */

import { sendEmail } from '../client'

export interface AmbassadorRejectionEmailData {
  to: string
  name: string
}

/**
 * Generate ambassador rejection email HTML
 */
function generateRejectionEmailHtml(data: AmbassadorRejectionEmailData): string {
  const { name } = data

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Actualización de Solicitud</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Vetic</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Programa de Embajadores</p>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.5;">
                Hola ${name},
              </p>
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                Gracias por tu interés en ser parte del Programa de Embajadores de Vetic. Después de revisar tu solicitud, en este momento no podemos aceptarla.
              </p>
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                Esto no significa que la puerta esté cerrada. Te invitamos a volver a postularte en el futuro cuando cuentes con:
              </p>
              <ul style="margin: 0 0 20px; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                <li style="margin-bottom: 8px;">Conexión activa con clínicas veterinarias</li>
                <li style="margin-bottom: 8px;">Experiencia en el sector veterinario</li>
                <li>Disponibilidad para promover la plataforma</li>
              </ul>
              <p style="margin: 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Mientras tanto, puedes usar Vetic con nuestro plan gratuito y conocer mejor la plataforma.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 40px 40px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vetic.com'}" style="display: inline-block; padding: 14px 32px; background-color: #6b7280; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Conocer Vetic
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center; line-height: 1.5;">
                Si tienes preguntas, escríbenos a embajadores@vetic.com
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
 * Send ambassador rejection email
 */
export async function sendAmbassadorRejectionEmail(data: AmbassadorRejectionEmailData) {
  return sendEmail({
    to: data.to,
    subject: 'Actualización de tu solicitud - Programa de Embajadores Vetic',
    html: generateRejectionEmailHtml(data),
  })
}
