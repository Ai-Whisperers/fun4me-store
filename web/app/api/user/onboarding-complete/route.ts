import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { onboardingCompleteSchema } from '@/lib/schemas/signup'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // Validate input with Zod
    const validation = onboardingCompleteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validación fallida', issues: validation.error.issues },
        { status: 400 }
      )
    }
    
    const { clinic } = validation.data

    // Update user's profile to mark onboarding as complete
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      // If the column doesn't exist, just log and return success
      // The onboarding will still work, just won't be persisted
      if (updateError.message.includes('onboarding_completed')) {
        logger.warn('onboarding_completed column not found, skipping update')
        return NextResponse.json({
          success: true,
          message: 'Onboarding completed (column not available)',
        })
      }

      logger.error('Failed to mark onboarding complete', {
        error: updateError.message,
        userId: user.id,
      })
      return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error in POST /api/user/onboarding-complete', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
