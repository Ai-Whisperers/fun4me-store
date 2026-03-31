import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { PetService } from '@/lib/services/pet-service'
import { logger } from '@/lib/logger'
import { apiUpdatePetSchema } from '@/lib/schemas/pet'

type Params = { id: string }

// GET a single pet by ID
export const GET = withApiAuthParams<Params>(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    const petService = new PetService(supabase)
    const isStaff = ['vet', 'admin'].includes(profile.role)

    const result = await petService.getById(id, user.id, profile.tenant_id, isStaff)

    if (!result.success) {
      logger.warn('Failed to fetch pet by ID', {
        petId: id,
        userId: user.id,
        error: result.error,
      })

      // Map service errors to API errors
      if (result.error?.includes('no encontrada')) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
      }
      if (result.error?.includes('permisos')) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: result.error },
      })
    }

    return NextResponse.json(result.data)
  }
)

// PATCH update a pet
export const PATCH = withApiAuthParams<Params>(
  async ({ params, request, user, profile, supabase }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    const isStaff = ['vet', 'admin'].includes(profile.role)

    // Parse and validate body
    let body
    try {
      body = await request.json()
    } catch {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    // VALID-004: Validate with Zod schema
    const validation = apiUpdatePetSchema.safeParse(body)
    if (!validation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: {
          errors: validation.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      })
    }

    const validatedBody = validation.data

    // Map form field names to database column names
    const fieldMapping: Record<string, string> = {
      name: 'name',
      species: 'species',
      breed: 'breed',
      weight_kg: 'weight_kg',
      microchip_id: 'microchip_number',
      diet_category: 'diet_category',
      diet_notes: 'diet_notes',
      sex: 'sex',
      is_neutered: 'is_neutered',
      color: 'color',
      temperament: 'temperament',
      allergies: 'allergies',
      existing_conditions: 'chronic_conditions',
      photo_url: 'photo_url',
      birth_date: 'birth_date',
      notes: 'notes',
    }

    const updates: Record<string, unknown> = {}
    for (const [formField, dbColumn] of Object.entries(fieldMapping)) {
      if (formField in validatedBody) {
        let value = validatedBody[formField as keyof typeof validatedBody]

        // Convert allergies string to array if needed
        if (dbColumn === 'allergies' && typeof value === 'string') {
          value = value
            ? value
                .split(',')
                .map((a: string) => a.trim())
                .filter((a: string) => a.length > 0)
            : []
        }

        // Convert existing_conditions to array for chronic_conditions
        if (dbColumn === 'chronic_conditions' && typeof value === 'string') {
          value = value ? [value] : []
        }

        updates[dbColumn] = value
      }
    }

    if (Object.keys(updates).length === 0) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { reason: 'No hay campos para actualizar' },
      })
    }

    // Use PetService to update
    const petService = new PetService(supabase)
    const result = await petService.update(id, user.id, profile.tenant_id, updates, isStaff)

    if (!result.success) {
      logger.error('Failed to update pet', {
        petId: id,
        userId: user.id,
        error: result.error,
      })

      // Map service errors to API errors
      if (result.error?.includes('no encontrada')) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
      }
      if (result.error?.includes('permisos')) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      return apiError('DATABASE_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: result.error },
      })
    }

    return NextResponse.json(result.data)
  },
  { rateLimit: 'write' }
)

// DELETE soft-delete a pet
export const DELETE = withApiAuthParams<Params>(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    const isStaff = ['vet', 'admin'].includes(profile.role)

    // Use PetService to delete
    const petService = new PetService(supabase)
    const result = await petService.delete(id, user.id, profile.tenant_id, isStaff)

    if (!result.success) {
      logger.error('Failed to delete pet', {
        petId: id,
        userId: user.id,
        error: result.error,
      })

      // Map service errors to API errors
      if (result.error?.includes('no encontrada')) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
      }
      if (result.error?.includes('permisos')) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      return apiError('DATABASE_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: result.error },
      })
    }

    return NextResponse.json({ success: true })
  },
  { rateLimit: 'write' }
)
