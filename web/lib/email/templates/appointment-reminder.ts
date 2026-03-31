/**
 * Appointment Reminder Email Template
 *
 * Generates HTML email for appointment reminders
 */

export interface AppointmentReminderEmailData {
  clinicName: string
  clinicLogo?: string
  clinicAddress?: string
  clinicPhone?: string
  clinicEmail?: string
  ownerName: string
  petName: string
  petSpecies?: string
  petPhotoUrl?: string
  appointmentDate: string
  appointmentTime: string
  serviceName: string
  serviceDescription?: string
  duration?: number
  vetName?: string
  specialInstructions?: string
  confirmationUrl?: string
  cancellationUrl?: string
  rescheduleUrl?: string
}

/**
 * Generate appointment reminder email HTML
 */
export function generateAppointmentReminderEmail(data: AppointmentReminderEmailData): string {
  const {
    clinicName,
    clinicLogo,
    clinicAddress,
    clinicPhone,
    clinicEmail,
    ownerName,
    petName,
    petSpecies,
    petPhotoUrl,
    appointmentDate,
    appointmentTime,
    serviceName,
    serviceDescription,
    duration,
    vetName,
    specialInstructions,
    confirmationUrl,
    cancellationUrl,
    rescheduleUrl,
  } = data

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Cita</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              ${clinicLogo ? `<img src="${clinicLogo}" alt="${clinicName}" style="max-width: 150px; height: auto; margin-bottom: 20px;">` : ''}
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">${clinicName}</h1>
              ${clinicAddress ? `<p style="margin: 8px 0 0; color: #d1fae5; font-size: 14px;">${clinicAddress}</p>` : ''}
              <div style="margin-top: 12px;">
                ${clinicPhone ? `<span style="color: #d1fae5; font-size: 14px; margin-right: 15px;">📞 ${clinicPhone}</span>` : ''}
                ${clinicEmail ? `<span style="color: #d1fae5; font-size: 14px;">✉️ ${clinicEmail}</span>` : ''}
              </div>
            </td>
          </tr>

          <!-- Icon & Title -->
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 15px;">📅</div>
              <h2 style="margin: 0 0 10px; color: #333333; font-size: 24px; font-weight: 600;">Recordatorio de Cita</h2>
              <p style="margin: 0; color: #10b981; font-size: 16px; font-weight: 600;">¡Te esperamos pronto!</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <p style="margin: 0; color: #666666; font-size: 16px; line-height: 1.5; text-align: center;">
                Hola <strong>${ownerName}</strong>, este es un recordatorio de la cita programada para <strong>${petName}</strong>.
              </p>
            </td>
          </tr>

          <!-- Pet Photo (if available) -->
          ${
            petPhotoUrl
              ? `
            <tr>
              <td style="padding: 0 40px 25px; text-align: center;">
                <img src="${petPhotoUrl}" alt="${petName}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #10b981; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              </td>
            </tr>
          `
              : ''
          }

          <!-- Appointment Details Card -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981; border-radius: 12px; padding: 25px;">

                <!-- Date & Time -->
                <div style="text-align: center; margin-bottom: 20px;">
                  <div style="color: #065f46; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
                    📅 Fecha y Hora
                  </div>
                  <div style="color: #064e3b; font-size: 22px; font-weight: 700;">
                    ${capitalizeFirst(formatDate(appointmentDate))}
                  </div>
                  <div style="color: #047857; font-size: 28px; font-weight: 700; margin-top: 8px;">
                    🕐 ${appointmentTime}
                  </div>
                  ${duration ? `<div style="color: #059669; font-size: 14px; margin-top: 6px;">Duración estimada: ${duration} minutos</div>` : ''}
                </div>

                <div style="border-top: 1px solid #10b981; margin: 20px 0;"></div>

                <!-- Service Info -->
                <div style="margin-bottom: 15px;">
                  <div style="color: #065f46; font-size: 13px; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">
                    🩺 Servicio
                  </div>
                  <div style="color: #064e3b; font-size: 18px; font-weight: 700;">
                    ${serviceName}
                  </div>
                  ${serviceDescription ? `<div style="color: #047857; font-size: 14px; margin-top: 4px;">${serviceDescription}</div>` : ''}
                </div>

                <!-- Pet Info -->
                <div style="margin-bottom: 15px;">
                  <div style="color: #065f46; font-size: 13px; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">
                    🐾 Mascota
                  </div>
                  <div style="color: #064e3b; font-size: 16px; font-weight: 600;">
                    ${petName}${petSpecies ? ` (${petSpecies})` : ''}
                  </div>
                </div>

                <!-- Vet Info -->
                ${
                  vetName
                    ? `
                  <div>
                    <div style="color: #065f46; font-size: 13px; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">
                      👨‍⚕️ Veterinario
                    </div>
                    <div style="color: #064e3b; font-size: 16px; font-weight: 600;">
                      ${vetName}
                    </div>
                  </div>
                `
                    : ''
                }

              </div>
            </td>
          </tr>

          <!-- Special Instructions -->
          ${
            specialInstructions
              ? `
            <tr>
              <td style="padding: 0 40px 25px;">
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                  <strong style="color: #92400e; font-size: 14px; display: block; margin-bottom: 5px;">⚠️ Instrucciones Especiales:</strong>
                  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5; white-space: pre-line;">${specialInstructions}</p>
                </div>
              </td>
            </tr>
          `
              : ''
          }

          <!-- Action Buttons -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                ${
                  confirmationUrl
                    ? `
                  <tr>
                    <td style="padding-bottom: 12px; text-align: center;">
                      <a href="${confirmationUrl}" style="display: inline-block; width: 100%; max-width: 300px; padding: 14px 24px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                        ✅ Confirmar Asistencia
                      </a>
                    </td>
                  </tr>
                `
                    : ''
                }
                ${
                  rescheduleUrl
                    ? `
                  <tr>
                    <td style="padding-bottom: 12px; text-align: center;">
                      <a href="${rescheduleUrl}" style="display: inline-block; width: 100%; max-width: 300px; padding: 12px 24px; background-color: #f3f4f6; color: #374151; text-decoration: none; border: 2px solid #d1d5db; border-radius: 6px; font-weight: 600; font-size: 14px;">
                        📆 Reprogramar
                      </a>
                    </td>
                  </tr>
                `
                    : ''
                }
                ${
                  cancellationUrl
                    ? `
                  <tr>
                    <td style="text-align: center;">
                      <a href="${cancellationUrl}" style="display: inline-block; width: 100%; max-width: 300px; padding: 12px 24px; background-color: #fef2f2; color: #991b1b; text-decoration: none; border: 2px solid #fecaca; border-radius: 6px; font-weight: 600; font-size: 14px;">
                        ❌ Cancelar Cita
                      </a>
                    </td>
                  </tr>
                `
                    : ''
                }
              </table>
            </td>
          </tr>

          <!-- Preparation Tips -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <h3 style="margin: 0 0 15px; color: #333333; font-size: 18px; font-weight: 600;">💡 Consejos para la visita:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.8;">
                <li>Llega 10 minutos antes de tu cita</li>
                <li>Trae la cartilla de vacunación de ${petName}</li>
                <li>Si es posible, mantén a ${petName} en ayunas según las instrucciones</li>
                <li>Trae una lista de preguntas o inquietudes que tengas</li>
                <li>Para mascotas nerviosas, considera traer su juguete favorito</li>
              </ul>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; text-align: center; line-height: 1.5;">
                Esperamos verte junto a ${petName} en tu cita.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center; line-height: 1.5;">
                Si necesitas hacer cambios o tienes alguna pregunta, no dudes en contactarnos.
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
 * Generate plain text version of appointment reminder email
 */
export function generateAppointmentReminderEmailText(data: AppointmentReminderEmailData): string {
  const {
    clinicName,
    clinicAddress,
    clinicPhone,
    clinicEmail,
    ownerName,
    petName,
    petSpecies,
    appointmentDate,
    appointmentTime,
    serviceName,
    serviceDescription,
    duration,
    vetName,
    specialInstructions,
    confirmationUrl,
    cancellationUrl,
    rescheduleUrl,
  } = data

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  let text = `${clinicName}\n`
  text += `${'='.repeat(clinicName.length)}\n`
  if (clinicAddress) text += `${clinicAddress}\n`
  if (clinicPhone || clinicEmail) {
    text += `${clinicPhone ? `Tel: ${clinicPhone}` : ''} ${clinicPhone && clinicEmail ? '|' : ''} ${clinicEmail ? `Email: ${clinicEmail}` : ''}\n`
  }
  text += `\n`

  text += `RECORDATORIO DE CITA\n`
  text += `¡Te esperamos pronto!\n\n`

  text += `Hola ${ownerName}, este es un recordatorio de la cita programada para ${petName}.\n\n`

  text += `FECHA Y HORA:\n`
  text += `${capitalizeFirst(formatDate(appointmentDate))}\n`
  text += `${appointmentTime}\n`
  if (duration) text += `Duración estimada: ${duration} minutos\n`
  text += `\n`

  text += `SERVICIO:\n${serviceName}\n`
  if (serviceDescription) text += `${serviceDescription}\n`
  text += `\n`

  text += `MASCOTA:\n${petName}${petSpecies ? ` (${petSpecies})` : ''}\n\n`

  if (vetName) {
    text += `VETERINARIO:\n${vetName}\n\n`
  }

  if (specialInstructions) {
    text += `INSTRUCCIONES ESPECIALES:\n${specialInstructions}\n\n`
  }

  if (confirmationUrl || rescheduleUrl || cancellationUrl) {
    text += `OPCIONES:\n`
    if (confirmationUrl) text += `Confirmar asistencia: ${confirmationUrl}\n`
    if (rescheduleUrl) text += `Reprogramar: ${rescheduleUrl}\n`
    if (cancellationUrl) text += `Cancelar cita: ${cancellationUrl}\n`
    text += `\n`
  }

  text += `CONSEJOS PARA LA VISITA:\n`
  text += `- Llega 10 minutos antes de tu cita\n`
  text += `- Trae la cartilla de vacunación de ${petName}\n`
  text += `- Si es posible, mantén a ${petName} en ayunas según las instrucciones\n`
  text += `- Trae una lista de preguntas o inquietudes que tengas\n`
  text += `- Para mascotas nerviosas, considera traer su juguete favorito\n\n`

  text += `Esperamos verte junto a ${petName} en tu cita.\n`
  text += `Si necesitas hacer cambios o tienes alguna pregunta, no dudes en contactarnos.\n`

  return text
}
