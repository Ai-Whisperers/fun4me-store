import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { z } from 'zod'

type Params = { id: string }

const weightSchema = z.object({
  weight_kg: z.number().positive().max(500, 'Peso máximo 500 kg'),
  notes: z.string().max(500).optional(),
})

// GET weight history for a pet
export const GET = withApiAuthParams<Params>(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<Params>) => {
    const { id: petId } = params

    // Verify access to pet
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('owner_id, tenant_id, birth_date')
      .eq('id', petId)
      .is('deleted_at', null)
      .single()

    if (petError || !pet) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    const isOwner = pet.owner_id === user.id
    const isStaff =
      (profile.role === 'vet' || profile.role === 'admin') && profile.tenant_id === pet.tenant_id

    if (!isOwner && !isStaff) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Fetch weight history
    const { data: weights, error } = await supabase
      .from('pet_weight_history')
      .select('id, weight_kg, recorded_at, notes, recorded_by')
      .eq('pet_id', petId)
      .is('deleted_at', null)
      .order('recorded_at', { ascending: true })

    if (error) {
      // Table might not exist yet
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        return NextResponse.json([])
      }
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Calculate age_weeks for each record
    const birthDate = pet.birth_date ? new Date(pet.birth_date) : null
    const msPerWeek = 7 * 24 * 60 * 60 * 1000

    const weightsWithAge = (weights || []).map((w) => {
      let age_weeks = null
      if (birthDate) {
        const recordDate = new Date(w.recorded_at)
        age_weeks = Math.floor((recordDate.getTime() - birthDate.getTime()) / msPerWeek)
      }
      return {
        ...w,
        date: w.recorded_at,
        age_weeks,
      }
    })

    return NextResponse.json(weightsWithAge)
  }
)

// POST new weight record
export const POST = withApiAuthParams<Params>(
  async ({ params, request, user, profile, supabase }: ApiHandlerContextWithParams<Params>) => {
    const { id: petId } = params

    // Verify access to pet
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('owner_id, tenant_id')
      .eq('id', petId)
      .is('deleted_at', null)
      .single()

    if (petError || !pet) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    const isOwner = pet.owner_id === user.id
    const isStaff =
      (profile.role === 'vet' || profile.role === 'admin') && profile.tenant_id === pet.tenant_id

    if (!isOwner && !isStaff) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Parse and validate body
    const body = await request.json()
    const validation = weightSchema.safeParse(body)

    if (!validation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: validation.error.flatten(),
      })
    }

    const { weight_kg, notes } = validation.data

    // Insert weight record
    const { data, error } = await supabase
      .from('pet_weight_history')
      .insert({
        pet_id: petId,
        tenant_id: pet.tenant_id,
        weight_kg,
        notes,
        recorded_by: user.id,
      })
      .select()
      .single()

    if (error) {
      // Table might not exist yet
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        // Fallback: just update the pet's weight directly
        const { error: updateError } = await supabase
          .from('pets')
          .update({ weight_kg })
          .eq('id', petId)

        if (updateError) {
          return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
        }

        return NextResponse.json({ weight_kg, fallback: true })
      }
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: error.message },
      })
    }

    return NextResponse.json(data, { status: 201 })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
