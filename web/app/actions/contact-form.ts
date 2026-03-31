'use server'

import { z } from 'zod'
import { logger } from '@/lib/logger'
import { checkActionRateLimit, ACTION_RATE_LIMITS } from '@/lib/auth/action-rate-limit'

type FormState = { success: true; message?: string } | { success: false; error: string } | null

const contactFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  phone: z.string().min(1, 'El teléfono es obligatorio'),
  petName: z.string().min(1, 'El nombre de la mascota es obligatorio'),
  reason: z.string().min(1, 'El motivo es obligatorio'),
})

export async function submitContactForm(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // SEC-011: Rate limit public form submissions
  const rateLimitResult = await checkActionRateLimit(ACTION_RATE_LIMITS.contactForm.type)
  if (!rateLimitResult.success) {
    return { success: false, error: rateLimitResult.message || 'Demasiados intentos. Espera un momento.' }
  }

  const rawData = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    petName: formData.get('petName'),
    reason: formData.get('reason'),
  }

  const validation = contactFormSchema.safeParse(rawData)
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    return { success: false, error: firstError.message }
  }

  try {
    // Simulate network delay for demo
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // In production, send email via Resend/Nodemailer or create a lead record
    // await resend.emails.send({ ... })

    return {
      success: true,
      message: '¡Gracias! Te contactaremos pronto para confirmar tu cita.',
    }
  } catch (error) {
    logger.error('Failed to submit contact form', {
      error: error instanceof Error ? error : undefined,
    })
    return { success: false, error: 'Error al enviar el formulario. Intenta de nuevo.' }
  }
}
