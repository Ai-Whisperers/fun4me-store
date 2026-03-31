'use server'

import { withActionAuth } from '@/lib/actions/with-action-auth'
import { actionSuccess, actionError } from '@/lib/actions/result'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Validation schema
const sendEmailSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  phone: z.string().min(1, 'El teléfono es obligatorio'),
  petName: z.string().min(1, 'El nombre de la mascota es obligatorio'),
  reason: z.string().min(1, 'El motivo es obligatorio'),
})

export const sendEmail = withActionAuth<void, [FormData]>(
  async (context, formData: FormData) => {
    // Validate input
    const rawFormData = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      petName: formData.get('petName'),
      reason: formData.get('reason'),
    }

    const validation = sendEmailSchema.safeParse(rawFormData)
    if (!validation.success) {
      const fieldErrors = Object.fromEntries(
        Object.entries(validation.error.flatten().fieldErrors).map(([key, value]) => [
          key,
          value?.[0] || 'Error de validación',
        ])
      )
      return actionError('Por favor corrige los errores del formulario', fieldErrors)
    }

    const validatedData = validation.data

    // Verify this is staff sending the email
    if (!context.isStaff) {
      return actionError('Solo el personal de la clínica puede enviar correos')
    }

    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // In a real app, use Resend or Nodemailer here
      // await resend.emails.send({ ... })

      return actionSuccess()
    } catch (error) {
      logger.error('Failed to send email', {
        error: error instanceof Error ? error : undefined,
        userId: context.user.id,
      })
      return actionError('Error al enviar el correo')
    }
  },
  { requireStaff: true }
)
