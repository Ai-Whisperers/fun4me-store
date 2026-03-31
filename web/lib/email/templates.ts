export function generateAppointmentConfirmationEmail({
  userName,
  petName,
  reason,
  dateTime,
  clinicName,
}: {
  userName: string
  petName: string
  reason: string
  dateTime: string
  clinicName: string
}) {
  return `
    Hola ${userName},

    Tu cita ha sido agendada con éxito:

    Mascota: ${petName}
    Motivo: ${reason}
    Fecha y Hora: ${dateTime}
    Clínica: ${clinicName}

    ¡Gracias por confiar en nosotros!

    Saludos,
    El equipo de la Clínica Veterinaria
  `
}

/**
 * Email sent when customer submits a booking request (before scheduling)
 */
export function generateBookingRequestEmail({
  userName,
  petName,
  services,
  estimatedDuration,
  preferences,
  notes,
  clinicName,
}: {
  userName: string
  petName: string
  services: string
  estimatedDuration: number
  preferences: string | null
  notes: string | null
  clinicName: string
}) {
  let preferencesSection = ''
  if (preferences) {
    preferencesSection = `
    Tus preferencias:
    ${preferences}`
  }

  let notesSection = ''
  if (notes) {
    notesSection = `
    Notas adicionales: ${notes}`
  }

  return `
    Hola ${userName},

    ¡Hemos recibido tu solicitud de cita!

    Detalles de la solicitud:
    ━━━━━━━━━━━━━━━━━━━━━━━━
    Mascota: ${petName}
    Servicio(s): ${services}
    Duración estimada: ${estimatedDuration} minutos
    Clínica: ${clinicName}
    ${preferencesSection}${notesSection}

    ¿Qué sigue?
    ━━━━━━━━━━━━━━━━━━━━━━━━
    Un miembro de nuestro equipo se comunicará contigo pronto para
    confirmar la fecha y hora de tu cita.

    Si tienes alguna pregunta, no dudes en contactarnos.

    ¡Gracias por confiar en nosotros!

    Saludos,
    El equipo de ${clinicName}
  `
}

/**
 * Email sent when clinic staff schedules a pending appointment
 */
export function generateSchedulingConfirmationEmail({
  userName,
  petName,
  services,
  dateTime,
  duration,
  vetName,
  clinicName,
  clinicAddress,
  clinicPhone,
}: {
  userName: string
  petName: string
  services: string
  dateTime: string
  duration: number
  vetName: string | null
  clinicName: string
  clinicAddress: string | null
  clinicPhone: string | null
}) {
  let locationSection = ''
  if (clinicAddress || clinicPhone) {
    locationSection = `
    Ubicación:
    ━━━━━━━━━━━━━━━━━━━━━━━━
    ${clinicAddress || ''}
    ${clinicPhone ? `Teléfono: ${clinicPhone}` : ''}`
  }

  return `
    Hola ${userName},

    ¡Tu cita ha sido confirmada!

    Detalles de la cita:
    ━━━━━━━━━━━━━━━━━━━━━━━━
    Mascota: ${petName}
    Servicio(s): ${services}
    Fecha y Hora: ${dateTime}
    Duración: ${duration} minutos
    ${vetName ? `Veterinario: ${vetName}` : ''}
    Clínica: ${clinicName}
    ${locationSection}

    Recordatorio:
    ━━━━━━━━━━━━━━━━━━━━━━━━
    Por favor llega 10-15 minutos antes de tu cita.
    Si necesitas cancelar o reprogramar, contáctanos con anticipación.

    ¡Te esperamos!

    Saludos,
    El equipo de ${clinicName}
  `
}
