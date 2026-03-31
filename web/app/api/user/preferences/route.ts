import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { z } from 'zod'

const userPreferencesSchema = z.object({
  defaultPetId: z.string().uuid().optional().nullable(),
  reminderType: z.enum(['email', 'sms', 'both', 'none']).optional(),
  reminderTimeBefore: z.enum(['24h', '12h', '1h', '30m']).optional(),
})

export async function GET(_request: Request) {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // 2. Get user's tenant context
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tenant_id, user_preferences')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
  }

  // 3. Return preferences (stored in JSONB column)
  const preferences = profile.user_preferences || {
    defaultPetId: null,
    reminderType: 'email',
    reminderTimeBefore: '24h',
  }

  return NextResponse.json(preferences, { status: 200 })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // 2. Get user's tenant context
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tenant_id, user_preferences')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
  }

  // 3. Parse and validate body
  const body = await request.json()
  const validation = userPreferencesSchema.safeParse(body)

  if (!validation.success) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      field_errors: validation.error.flatten().fieldErrors,
    })
  }

  // 4. Merge with existing preferences
  const currentPreferences = profile.user_preferences || {
    defaultPetId: null,
    reminderType: 'email',
    reminderTimeBefore: '24h',
  }

  const updatedPreferences = {
    ...currentPreferences,
    ...validation.data,
  }

  // 5. Update in database
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ user_preferences: updatedPreferences })
    .eq('id', user.id)

  if (updateError) {
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return NextResponse.json({ success: true, preferences: updatedPreferences }, { status: 200 })
}
