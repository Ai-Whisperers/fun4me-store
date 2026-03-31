/**
 * Consent Request Email Template
 *
 * Generates HTML email for consent form signature requests
 */

export interface ConsentRequestEmailData {
  clinicName: string
  clinicLogo?: string
  clinicPhone?: string
  clinicEmail?: string
  ownerName: string
  petName: string
  consentType: string
  consentCategory?: string
  signingLink: string
  expiresAt: string
  requestedBy?: string
  additionalMessage?: string
}

/**
 * Generate consent request email HTML
 */
export function generateConsentRequestEmail(data: ConsentRequestEmailData): string {
  const {
    clinicName,
    clinicLogo,
    clinicPhone,
    clinicEmail,
    ownerName,
    petName,
    consentType,
    consentCategory,
    signingLink,
    expiresAt,
    requestedBy,
    additionalMessage,
  } = data

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const categoryEmoji =
    consentCategory === 'surgery'
      ? '🏥'
      : consentCategory === 'anesthesia'
        ? '💉'
        : consentCategory === 'euthanasia'
          ? '🕊️'
          : consentCategory === 'treatment'
            ? '💊'
            : '📋'

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitud de Consentimiento</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 8px 8px 0 0;">
              ${clinicLogo ? `<img src="${clinicLogo}" alt="${clinicName}" style="max-width: 150px; height: auto; margin-bottom: 20px;">` : ''}
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">${clinicName}</h1>
              <div style="margin-top: 12px;">
                ${clinicPhone ? `<span style="color: #e0e0e0; font-size: 14px; margin-right: 15px;">📞 ${clinicPhone}</span>` : ''}
                ${clinicEmail ? `<span style="color: #e0e0e0; font-size: 14px;">✉️ ${clinicEmail}</span>` : ''}
              </div>
            </td>
          </tr>

          <!-- Icon & Title -->
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 20px;">${categoryEmoji}</div>
              <h2 style="margin: 0 0 10px; color: #333333; font-size: 24px; font-weight: 600;">Solicitud de Consentimiento</h2>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <p style="margin: 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Hola <strong>${ownerName}</strong>,
              </p>
              <p style="margin: 15px 0 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Necesitamos tu autorización para proceder con el siguiente consentimiento relacionado a <strong>${petName}</strong>:
              </p>
            </td>
          </tr>

          <!-- Consent Info Box -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <div style="background-color: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px;">
                <div style="color: #1e40af; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
                  ${consentCategory ? consentCategory.toUpperCase() : 'CONSENTIMIENTO'}
                </div>
                <div style="color: #1e3a8a; font-size: 18px; font-weight: 700; margin-bottom: 12px;">
                  ${consentType}
                </div>
                <div style="color: #3b82f6; font-size: 14px; margin-top: 10px;">
                  <strong>Mascota:</strong> ${petName}
                </div>
                ${
                  requestedBy
                    ? `
                  <div style="color: #3b82f6; font-size: 14px; margin-top: 6px;">
                    <strong>Solicitado por:</strong> ${requestedBy}
                  </div>
                `
                    : ''
                }
              </div>
            </td>
          </tr>

          <!-- Additional Message -->
          ${
            additionalMessage
              ? `
            <tr>
              <td style="padding: 0 40px 25px;">
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                  <strong style="color: #92400e; font-size: 14px; display: block; margin-bottom: 5px;">Mensaje del equipo:</strong>
                  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5; white-space: pre-line;">${additionalMessage}</p>
                </div>
              </td>
            </tr>
          `
              : ''
          }

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 25px; text-align: center;">
              <a href="${signingLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                ✍️ Firmar Consentimiento
              </a>
            </td>
          </tr>

          <!-- Link Fallback -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center; line-height: 1.5;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 8px 0 0; color: #3b82f6; font-size: 12px; text-align: center; word-break: break-all;">
                ${signingLink}
              </p>
            </td>
          </tr>

          <!-- Expiration Notice -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px;">
                <strong style="color: #991b1b; font-size: 14px; display: block; margin-bottom: 5px;">⏰ Fecha límite:</strong>
                <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">
                  Este enlace expira el <strong>${formatDate(expiresAt)}</strong>. Por favor, completa la firma antes de esta fecha.
                </p>
              </div>
            </td>
          </tr>

          <!-- Process Info -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <h3 style="margin: 0 0 15px; color: #333333; font-size: 18px; font-weight: 600;">¿Cómo funciona?</h3>
              <ol style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.8;">
                <li>Haz clic en el botón "Firmar Consentimiento" arriba</li>
                <li>Revisa cuidadosamente el documento de consentimiento</li>
                <li>Completa los campos requeridos y firma digitalmente</li>
                <li>Recibirás una confirmación cuando se registre tu firma</li>
              </ol>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; text-align: center; line-height: 1.5;">
                Tu firma es importante para el bienestar de ${petName}.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center; line-height: 1.5;">
                Si tienes alguna pregunta o necesitas más información, no dudes en contactarnos.
              </p>
              ${
                clinicPhone || clinicEmail
                  ? `
                <p style="margin: 10px 0 0; color: #999999; font-size: 12px; text-align: center;">
                  ${clinicPhone ? `📞 ${clinicPhone}` : ''} ${clinicPhone && clinicEmail ? '|' : ''} ${clinicEmail ? `✉️ ${clinicEmail}` : ''}
                </p>
              `
                  : ''
              }
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
 * Generate plain text version of consent request email
 */
export function generateConsentRequestEmailText(data: ConsentRequestEmailData): string {
  const {
    clinicName,
    ownerName,
    petName,
    consentType,
    consentCategory,
    signingLink,
    expiresAt,
    requestedBy,
    additionalMessage,
  } = data

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  let text = `${clinicName}\n`
  text += `${'='.repeat(clinicName.length)}\n\n`
  text += `SOLICITUD DE CONSENTIMIENTO\n\n`
  text += `Hola ${ownerName},\n\n`
  text += `Necesitamos tu autorización para proceder con el siguiente consentimiento relacionado a ${petName}:\n\n`

  if (consentCategory) {
    text += `CATEGORÍA: ${consentCategory.toUpperCase()}\n`
  }
  text += `TIPO: ${consentType}\n`
  text += `MASCOTA: ${petName}\n`

  if (requestedBy) {
    text += `SOLICITADO POR: ${requestedBy}\n`
  }

  text += `\n`

  if (additionalMessage) {
    text += `MENSAJE DEL EQUIPO:\n${additionalMessage}\n\n`
  }

  text += `ENLACE PARA FIRMAR:\n${signingLink}\n\n`
  text += `FECHA LÍMITE: ${formatDate(expiresAt)}\n`
  text += `Este enlace expira en la fecha indicada. Por favor, completa la firma antes de esta fecha.\n\n`

  text += `CÓMO FUNCIONA:\n`
  text += `1. Accede al enlace de firma\n`
  text += `2. Revisa cuidadosamente el documento de consentimiento\n`
  text += `3. Completa los campos requeridos y firma digitalmente\n`
  text += `4. Recibirás una confirmación cuando se registre tu firma\n\n`

  text += `Tu firma es importante para el bienestar de ${petName}.\n`
  text += `Si tienes alguna pregunta o necesitas más información, no dudes en contactarnos.\n`

  return text
}
